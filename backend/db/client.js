import pg from 'pg';

export default class DB {
    #dbClient = null;
    #dbHost = '';
    #dbPort = '';
    #dbName = '';
    #dbLogin = '';
    #dbPassword = '';

    constructor() {
        this.#dbHost = process.env.DB_HOST;
        this.#dbPort = process.env.DB_PORT;
        this.#dbName = process.env.DB_NAME;
        this.#dbLogin = process.env.DB_LOGIN;
        this.#dbPassword = process.env.DB_PASSWORD;

        this.#dbClient = new pg.Client({
            user: this.#dbLogin,
            password: this.#dbPassword,
            host: this.#dbHost,
            port: this.#dbPort,
            database: this.#dbName
        });
    }

    async connect() {
        try {
            await this.#dbClient.connect();
            console.log('DB connection established');
        } catch(error) {
            console.error('Unable to connect to DB: ', error);
            return Promise.reject(error);
        }
    }

    async disconnect() {
        await this.#dbClient.end();
        console.log('DB connection was closed');
    }

    async getTasklists() {
        try {
            const tasklists = await this.#dbClient.query(
                'SELECT t1.id, t1.name, t1.position, t1.tasks, sum(p.weight) as duration FROM tasklists t1 LEFT JOIN tasks t2 ON t1.id = t2.tasklist_id left join procedures p on p.id = t2.procedure::uuid group by t1.id, t1.name, t1.position, t1.tasks order by name;'
            );

            return tasklists.rows;
        } catch (error) {
            console.log('Unable get tasklists, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async getProcedures() {
        try {
            const procedures = await this.#dbClient.query(
                'SELECT * FROM procedures order by weight'
            );

            return procedures.rows;
        } catch (error) {
            console.log('Unable get procedures, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async getDuration({
        draggedTask,
        currentTask
    } = {
        draggedTask: null,
        currentTask: null
    }) {
        if (!draggedTask || !currentTask ) {
            const errMsg = `Add tasklist error: wrong params (draggedTask: ${draggedTask}, currentTask: ${currentTask})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            const dbTaskDuration = await this.#dbClient.query(
                'SELECT p.weight FROM tasks t left join procedures p on p.id = t.procedure::uuid where t.id = $1;',
                [draggedTask]
            );
            const taskDuration = dbTaskDuration.rows[0].weight

            const dbTasklistDuration = await this.#dbClient.query(
                'SELECT t1.duration FROM tasklists t1 LEFT JOIN tasks t2 ON t1.id = t2.tasklist_id where t2.id = $1;',
                [currentTask]
            );
            const tasklistDuration = dbTasklistDuration.rows[0].duration

            return [taskDuration, tasklistDuration];
        } catch (error) {
            console.log('Unable get tasklists, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async getTasks() {
        try {
            const tasks = await this.#dbClient.query(
                "SELECT t.id, t.text, t.position, CONCAT(p.name, ' [', p.weight, ']') as procedure, t.tasklist_id FROM tasks t left join procedures p on (t.procedure::uuid = p.id) ORDER BY tasklist_id, position;"
            );

            return tasks.rows;
        } catch (error) {
            console.log('Unable get tasks, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async addTasklist({
        tasklistID,
        name,
        position = -1
    } = {
        tasklistID: null,
        name: '',
        position: -1
    }) {
        if (!tasklistID || !name || position < 0) {
            const errMsg = `Add tasklist error: wrong params (id: ${tasklistID}, name: ${name}, position: ${position})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            await this.#dbClient.query(
                'INSERT INTO tasklists (id, name, position) VALUES ($1, $2, $3);',
                [tasklistID, name, position]
            );
            await this.#dbClient.query(
                'WITH SortedIndex AS (SELECT name, ROW_NUMBER() OVER (ORDER BY name) AS position FROM tasklists) UPDATE tasklists AS s SET position = si.position FROM SortedIndex AS si WHERE s.name = si.name;');
        } catch (error) {
            console.log('Unable add tasklist, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async addTask({
        taskID,
        text,
        position = -1,
        tasklistID, 
        procedureID
    } = {
        taskID: null,
        text: '',
        position: -1,
        tasklistID: null, 
        procedureID: null
    }) {
        if (!taskID || !text || position < 0 || !tasklistID || !procedureID ) {
            const errMsg = `Add tasklist error: wrong params (id: ${taskID}, name: ${text}, position: ${position}, tasklistID: ${tasklistID}, procedureID: ${procedureID})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            const tasklistDuration = await this.#dbClient.query(
                'SELECT duration FROM tasklists WHERE id = $1;',
                [tasklistID]
            );

            const taskDuration = await this.#dbClient.query(
                'SELECT weight from procedures where id = $1;',
                [procedureID]
            );

            const totalDuration = Number(tasklistDuration.rows[0].duration) + Number(taskDuration.rows[0].weight);
            if (totalDuration <= 240) {
                await this.#dbClient.query(
                    'INSERT INTO tasks (id, text, position, procedure, tasklist_id) VALUES ($1, $2, $3, $4, $5);',
                    [taskID, text, position, procedureID, tasklistID]
                );
    
                await this.#dbClient.query(
                    'UPDATE tasklists set tasks = array_append(tasks, $1) WHERE id = $2;',
                    [taskID, tasklistID]
                );

                await this.#dbClient.query(
                    "UPDATE tasklists SET duration = (SELECT COALESCE(SUM(procedures.weight), 0) FROM tasks left join procedures on (tasks.procedure::uuid = procedures.id) WHERE tasks.tasklist_id = tasklists.id) WHERE id = $1;",
                    [tasklistID]
                );
                return 200;
            } else {
                return 201;
            }
        } catch (error) {
            console.log('Unable add task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async updateTask({
        taskID,
        text,
        position = -1
    } = {
        taskID: null,
        text: '',
        position: -1
    }) {
        if (!taskID || (!text && position < 0)) {
            const errMsg = `Update task error: wrong params (id: ${taskID}, text: ${text}, position: ${position})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }

        let query = null;
        const queryParams = [];
        if (text && position >= 0) {
            query = 'UPDATE tasks SET text = $1, position = $2 where id = $3;';
            queryParams.push(text, position, taskID);
        } else if (text) {
            query = 'UPDATE tasks SET text = $1 where id = $2;';
            queryParams.push(text, taskID);
        } else {
            query = 'UPDATE tasks SET position = $1 where id = $2;';
            queryParams.push(position, taskID);
        }

        try {
            await this.#dbClient.query(query, queryParams);
        } catch (error) {
            console.log('Unable add task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async deleteTask({taskID} = {taskID: null}) {
        if (!taskID ) {
            const errMsg = `Add tasklist error: wrong params (id: ${taskID})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            const queryResult = await this.#dbClient.query(
                'SELECT tasklist_id FROM tasks WHERE id = $1;',
                [taskID]
            );

            const { tasklist_id: tasklistID} = queryResult.rows[0]

            await this.#dbClient.query(
                'DELETE FROM tasks WHERE id = $1;',
                [taskID]
            );

            await this.#dbClient.query(
                'UPDATE tasklists SET tasks = array_remove(tasks, $1) WHERE id = $2;',
                [taskID, tasklistID]
            );

            await this.#dbClient.query(
                "UPDATE tasklists SET duration = (SELECT COALESCE(SUM(procedures.weight), 0) FROM tasks left join procedures on (tasks.procedure::uuid = procedures.id) WHERE tasks.tasklist_id = tasklists.id) WHERE id = $1;",
                [tasklistID]
            );
        } catch (error) {
            console.log('Unable delete task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async deleteTasklist({tasklistID} = {tasklistID: null}) {
        if (!tasklistID ) {
            const errMsg = `Add tasklist error: wrong params (id: ${tasklistID})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            await this.#dbClient.query(
                'DELETE FROM tasks WHERE tasklist_id = $1;',
                [tasklistID]
            );

            await this.#dbClient.query(
                'DELETE FROM tasklists WHERE id = $1;',
                [tasklistID]
            );
        } catch (error) {
            console.log('Unable delete task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async editTasklist({
        tasklistID,
        name
    } = {
        tasklistID: null,
        name: ''
    }) {
        if (!tasklistID || !name ) {
            const errMsg = `Update tasklist error: wrong params (id: ${taskID}, name: ${name})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }

        let query = null;
        const queryParams = [];
        query = 'UPDATE tasklists SET name = $1 where id = $2;';
        queryParams.push(name, tasklistID);

        try {
            await this.#dbClient.query(query, queryParams);
        } catch (error) {
            console.log('Unable add task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }

    async moveTask({
        taskID,
        srcTasklistID,
        destTasklistID
    } = {
        taskID: null,
        srcTasklistID: null,
        destTasklistID: null
    }) {
        if (!taskID || !srcTasklistID || !destTasklistID) {
            const errMsg = `Add tasklist error: wrong params (id: ${taskID}, srcTasklistID: ${srcTasklistID}, destTasklistID: ${destTasklistID})`;
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg)
            });
        }
        try {
            await this.#dbClient.query(
                'UPDATE tasks SET tasklist_id = $1 WHERE id = $2;',
                [destTasklistID, taskID]
            );

            await this.#dbClient.query(
                'UPDATE tasklists SET tasks = array_append(tasks, $1) WHERE id = $2;',
                [taskID, destTasklistID]
            );

            await this.#dbClient.query(
                'UPDATE tasklists SET tasks = array_remove(tasks, $1) WHERE id = $2;',
                [taskID, srcTasklistID]
            );

            await this.#dbClient.query(
                "UPDATE tasklists SET duration = (SELECT COALESCE(SUM(procedures.weight), 0) FROM tasks left join procedures on (tasks.procedure::uuid = procedures.id) WHERE tasks.tasklist_id = tasklists.id) WHERE id = $1;",
                [srcTasklistID]
            );

            await this.#dbClient.query(
                "UPDATE tasklists SET duration = (SELECT COALESCE(SUM(procedures.weight), 0) FROM tasks left join procedures on (tasks.procedure::uuid = procedures.id) WHERE tasks.tasklist_id = tasklists.id) WHERE id = $1;",
                [destTasklistID]
            );
        } catch (error) {
            console.log('Unable move task, error: ', error);
            return Promise.reject({
                type: 'internal',
                error
            });
        }
    }
};
