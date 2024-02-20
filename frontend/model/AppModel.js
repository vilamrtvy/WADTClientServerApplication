export default class AppModel {
    static async getTasklists() {
        try {
            const tasklistsResponse = await fetch('http://localhost:4321/tasklists');
            const tasklistsBody = await tasklistsResponse.json();

            if (tasklistsResponse.status !== 200) {
                return Promise.reject(tasklistsBody);
            }

            return tasklistsBody.tasklists;
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async getProcedures() {
        try {
            const proceduresResponse = await fetch('http://localhost:4321/procedures');
            const proceduresBody = await proceduresResponse.json();

            if (proceduresResponse.status !== 200) {
                return Promise.reject(proceduresBody);
            }

            return proceduresBody;
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async addTasklist({ tasklistID, name, position = -1 } = { tasklistID: null, name: '', position: -1 }) {
        try {
            const addTasklistResponse = await fetch(
                'http://localhost:4321/tasklists',
                {
                    method: 'POST',
                    body: JSON.stringify({ tasklistID, name, position}),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (addTasklistResponse.status !== 200) {
                const addTasklistBody = await addTasklistResponse.json();
                return Promise.reject(addTasklistBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Список задач '${name}' был успешно добавлен в перечень списков`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async addTask({ taskID, text, position = -1, tasklistID, procedureID } = { taskID: null, text: '', position: -1, tasklistID: null, procedureID: null }) {
        try {
            const addTaskResponse = await fetch(
                'http://localhost:4321/tasks',
                {
                    method: 'POST',
                    body: JSON.stringify({ taskID, text, position, tasklistID, procedureID}),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (addTaskResponse.status !== 200 && addTaskResponse.status !== 201) {
                const addTaskBody = await addTaskResponse.json();
                return Promise.reject(addTaskBody);
            } else {
                if (addTaskResponse.status === 201) {
                    return {
                        timestamp: new Date().toISOString(),
                        message: `ПРЕВЫШЕНА ДЛИТЕЛЬНОСТЬ РАБОЧЕГО ДНЯ`,
                        code: 1
                    };
                } else {
                    return {
                        timestamp: new Date().toISOString(),
                        message: `ПРОЦЕДУРА УСПЕШНО ЗАПИСАНА`,
                        code: 0
                    };
                }
            }
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async updateTask({ taskID, text, position = -1 } = { taskID: null, text: '', position: -1 }) {
        try {
            const updateTaskResponse = await fetch(
                `http://localhost:4321/tasks/${taskID}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ text, position}),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (updateTaskResponse.status !== 200) {
                const updateTaskBody = await updateTaskResponse.json();
                return Promise.reject(updateTaskBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Параметры задачи '${text}' были успешно изменены`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async updateTasks({ reorderedTasks = [] } = { reorderedTasks: [] }) {
       console.log('pomogite');
        try {
            const updateTasksResponse = await fetch(
                `http://localhost:4321/tasks`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ reorderedTasks }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (updateTasksResponse.status !== 200) {
                const updateTasksBody = await updateTasksResponse.json();
                return Promise.reject(updateTasksBody);
            };

            return {
                timestamp: new Date().toISOString(),
                message: `Порядок задач в списке(ах) был успешно изменен`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async deleteTask({ taskID } = { taskID: null }) {
        try {
            const deleteTaskResponse = await fetch(
                `http://localhost:4321/tasks/${taskID}`,
                {
                    method: 'DELETE'
                }
            );

            if (deleteTaskResponse.status !== 200) {
                const deleteTaskBody = await deleteTaskResponse.json();
                return Promise.reject(deleteTaskBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Сеанс удален успешно`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async deleteTasklist({ tasklistID } = { tasklistID: null }) {
        try {
            const deleteTasklistResponse = await fetch(
                `http://localhost:4321/tasklists/${tasklistID}`,
                {
                    method: 'DELETE'
                }
            );

            if (deleteTasklistResponse.status !== 200) {
                const deleteTasklistBody = await deleteTasklistResponse.json();
                return Promise.reject(deleteTasklistBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Смена успешно удалена`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async editTasklist({ tasklistID, name } = { tasklistID: null, name: '' }) {
        try {
            const editTasklistResponse = await fetch(
                `http://localhost:4321/tasklists/${tasklistID}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ tasklistID, name }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (editTasklistResponse.status !== 200) {
                const editTasklistBody = await editTasklistResponse.json();
                return Promise.reject(editTasklistBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Параметры задачи '${text}' были успешно изменены`
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async countDurationTasklist({ draggedTask, currentTask }) {
        try {
            const durationResponse = await fetch(
                'http://localhost:4321/duration',
                {
                    method: 'PATCH',
                    body: JSON.stringify({ draggedTask, currentTask }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const durationBody = await durationResponse.json();

            if (durationResponse.status !== 200) {
                return Promise.reject(durationBody);
            }

            return durationBody.durations;

        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }

    static async moveTask({ taskID, srcTasklistID, destTasklistID } = { taskID: null, srcTasklistID: null, destTasklistID: null }) {
        try {
            const moveTaskResponse = await fetch(
                `http://localhost:4321/tasklists`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ taskID, srcTasklistID, destTasklistID }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (moveTaskResponse.status !== 200) {
                const moveTaskBody = await moveTaskResponse.json();
                return Promise.reject(moveTaskBody);
            }

            return {
                timestamp: new Date().toISOString(),
                message: ``
            };
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            });
        }
    }


};