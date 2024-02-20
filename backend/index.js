import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import DB from './db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: './backend/.env'
})

const appHost = process.env.APP_HOST;
const appPort = process.env.APP_PORT;

const app = express();
const db = new DB();

// logging middleware
app.use('*', (req, res, next) => {
    console.log(
        req.method,
        req.baseUrl || req.url,
        new Date().toISOString()
    );

    next();
});

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    // Добавляем ведущий ноль для месяцев и дней, если они состоят из одной цифры
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;

    return `${day}/${month}/${year}`;
};

//middleware for static app files
app.use('/', express.static(path.resolve(__dirname, '../dist')));

// get tasklists and tasks
app.get('/tasklists', async (req, res) => {
    try {
        const [dbTasklists, dbTasks] = await Promise.all([db.getTasklists(), db.getTasks()]);

        const tasks = dbTasks.map(({ id, text, position, procedure }) => ({
            taskID: id, text, position, procedure
        }))

        const tasklists = dbTasklists.map(tasklist => ({
            tasklistID: tasklist.id,
            name: formatDate(new Date(tasklist.name).toLocaleDateString()), 
            position: tasklist.position,
            tasks: tasks.filter(task => tasklist.tasks.indexOf(task.taskID) !== -1),
            duration: tasklist.duration
        }));

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({ tasklists });
    } catch(err) {
        res.statusCode = 500;
        res.statusMessage = 'Internal server error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Getting tasklists and tasks error: ${err.error.message}`
        });
    }
});

// body parsing middleware
app.use('/procedures', express.json());

// get procedures
app.get('/procedures', async (req, res) => {
    try {
        const [dbProcedures] = await Promise.all([db.getProcedures()]);

        const procedures = dbProcedures.map(({ id, name, weight }) => ({
            procedureID: id, name, weight
        }))

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({ procedures });
    } catch(err) {
        res.statusCode = 500;
        res.statusMessage = 'Internal server error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Getting procedures error: ${err.error.message}`
        });
    }
});

// body parsing middleware
app.use('/duration', express.json());

// get procedures
app.patch('/duration', async (req, res) => {
    try {
        const { draggedTask, currentTask } = req.body;
        // console.log(draggedTask, currentTask)
        const taskDuration = await db.getDuration({ draggedTask, currentTask });

        const durations = {
            task: taskDuration[0],
            tasklist: taskDuration[1]
          };

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({ durations });
    } catch(err) {
        res.statusCode = 500;
        res.statusMessage = 'Internal server error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Getting procedures error: ${err.error.message}`
        });
    }
});

// body parsing middleware
app.use('/tasklists', express.json());

// add tasklist
app.post('/tasklists', async (req, res) => {
    try {
        const { tasklistID, name, position } = req.body;
        await db.addTasklist({ tasklistID, name, position });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add tasklist error: ${err.error.message || err.error}`
        });
    }
});

// body parsing middleware
app.use('/tasks', express.json());

// add tasks
app.post('/tasks', async (req, res) => {
    try {
        const { taskID, text, position, tasklistID, procedureID } = req.body;
        const dbStatusCode = await db.addTask({ taskID, text, position, tasklistID, procedureID });

        res.statusCode = dbStatusCode;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add task error: ${err.error.message || err.error}`
        });
    }
});

// body parsing middleware
app.use('/tasks/:taskID', express.json());

// edit task params
app.patch('/tasks/:taskID', async (req, res) => {
    try {
        const { taskID } = req.params;
        const { text, position } = req.body;
        await db.updateTask({ taskID, text, position });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Update task error: ${err.error.message || err.error}`
        });
    }
});

// body parsing middleware
app.use('/tasklists/:tasklistID', express.json());

// edit task params
app.patch('/tasklists/:tasklistID', async (req, res) => {
    try {
        const { tasklistID } = req.params;
        const { name } = req.body;
        await db.editTasklist({ tasklistID, name });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Update task error: ${err.error.message || err.error}`
        });
    }
});

// edit several tasks position
app.patch('/tasks', async (req, res) => {
    try {
        const { reorderedTasks } = req.body;

        await Promise.all(
            reorderedTasks.map(({ taskID, position}) => db.updateTask({ taskID, position }))
        );

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Update tasks error: ${err.error.message || err.error}`
        });
    }
});

// delete task
app.delete('/tasks/:taskID', async (req, res) => {
    try {
        const { taskID } = req.params;

        await db.deleteTask({ taskID });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete task error: ${err.error.message || err.error}`
        });
    }
});

// delete tasklist
app.delete('/tasklists/:tasklistID', async (req, res) => {
    try {
        const { tasklistID } = req.params;

        await db.deleteTasklist({ tasklistID });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete task error: ${err.error.message || err.error}`
        });
    }
});

// move task between tasklists
app.patch('/tasklists', async (req, res) => {
    try {
        const { taskID, srcTasklistID, destTasklistID } = req.body ;

        await db.moveTask({ taskID, srcTasklistID, destTasklistID });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch(err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Bad request';
                break;

            default:
                res.statusCode = 500;
                res.statusMessage = 'Internal server error';
        }

        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Move task error: ${err.error.message || err.error}`
        });
    }
});

const server = app.listen(Number(appPort), appHost, async () => {
    try {
        await db.connect();
    } catch (error) {
        console.log('Task manager app shut down');
        process.exit(100);
    }

    console.log(`Task manager app started at host http://${appHost}:${appPort}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        await db.disconnect();
        console.log('HTTP server closed');
    });
});