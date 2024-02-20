import AppModel from '../model/AppModel'
import Task from './Task';

export default class Tasklist {
  #tasks = [];
  #tasklistName = '';
  #tasklistID = null;
  #tasklistPosition = -1;
  #duration = 0;

  constructor({
    tasklistID = null, 
    name,
    position,
    duration,
    onDropTaskInTasklist,
    addNotification
  }) {
    this.#tasklistName = name;
    this.#tasklistID = tasklistID || crypto.randomUUID();
    this.#tasklistPosition = position;
    this.#duration = duration;
    this.onDropTaskInTasklist = onDropTaskInTasklist;
    this.addNotification = addNotification;
  }

  get tasklistID() { return this.#tasklistID; }

  get tasklistPosition() { return this.#tasklistPosition; }

  pushTask = ({ task }) => this.#tasks.push(task);

  getTaskById = ({ taskID }) => this.#tasks.find(task => task.taskID === taskID);

  deleteTask = ({ taskID }) => {
    const deleteTaskIndex = this.#tasks.findIndex(task => task.taskID === taskID);

    if (deleteTaskIndex === -1) return;

    const [deletedTask] = this.#tasks.splice(deleteTaskIndex, 1);

    return deletedTask;
  };

  deleteTasklist = ({ tasklistID }) => {
    const deleteTasklistIndex = this.#tasklistID;

    if (deleteTasklistIndex === -1) return;

    const [deletedTasklist] = this.#tasks.splice(deleteTasklistIndex, 1);

    return deletedTasklist;
  };

  reorderTasks = async () => {
    const orderedTasksIDs = Array.from(
      document.querySelector(`[id="${this.#tasklistID}"] .tasklist__tasks-list`).children,
      elem => elem.getAttribute('id')
    );

    console.log('param');

    const reorderedTasksInfo = [];

    orderedTasksIDs.forEach((taskID, position) => {
      const task = this.#tasks.find(task => task.taskID === taskID);
      if (task.taskPosition !== position) {
        task.taskPosition = position;
        reorderedTasksInfo.push({ taskID, position });
      }
    });

    if (reorderedTasksInfo.length > 0) {
      try {
        await AppModel.updateTasks({ reorderedTasks: reorderedTasksInfo });
      } catch (err) {
        this.addNotification({ text: err.message, type: 'error' });
        console.error(err);
      }
    }
  };

  appendNewTask = async ({ text, procedureID, procedureText }) => {
    try {
      const taskID = crypto.randomUUID();

      const addTaskResult = await AppModel.addTask({
        taskID,
        text,
        position: this.#tasks.length,
        tasklistID: this.#tasklistID,
        procedureID: procedureID
      });

      if (addTaskResult.code === 1) {
        this.addNotification({ text: addTaskResult.message, type: 'error' });
      } else {
        this.addNewTaskLocal({
          taskID,
          text,
          position: this.#tasks.length,
          procedure: procedureText
        });
  
        this.addNotification({ text: addTaskResult.message, type: 'success' });
      }    
    } catch (err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  };

  addNewTaskLocal = ({ taskID = null, text, position, procedure }) => {
    const newTask = new Task({
      taskID, 
      text,
      position, 
      procedure
    });
    this.#tasks.push(newTask);

    const newTaskElement = newTask.render();
    document.querySelector(`[id="${this.#tasklistID}"] .tasklist__tasks-list`)
      .appendChild(newTaskElement);
  };

  render() {
    const liElement = document.createElement('li');
    liElement.classList.add(
      'tasklists-list__item',
      'tasklist'
    );
    liElement.setAttribute('id', this.#tasklistID);
    liElement.addEventListener(
      'dragstart',
      () => localStorage.setItem('srcTasklistID', this.#tasklistID)
    );
    liElement.addEventListener('drop', this.onDropTaskInTasklist);

    const h2Element = document.createElement('h2');
    h2Element.classList.add('tasklist__name');
    h2Element.innerHTML = this.#tasklistName;

    h2Element.classList.add('task__controls-delete-btn');
    const groupButton = document.createElement('div')

    const editBtn = document.createElement('button');
    editBtn.setAttribute('type', 'button');
    editBtn.classList.add('task__contol-btn-2', 'edit-icon');
    editBtn.addEventListener('click', () => {
      localStorage.setItem('editTasklistID', this.#tasklistID);
      document.getElementById('modal-edit-task').showModal();
    });
    groupButton.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.setAttribute('type', 'button');
    deleteBtn.classList.add('task__contol-btn-2', 'delete-icon');
    deleteBtn.addEventListener('click', () => {
      localStorage.setItem('deleteTasklistID', this.#tasklistID);

      const deleteTaskModal = document.getElementById('modal-delete-task');
      deleteTaskModal.querySelector('.app-modal__question')
        .innerHTML = `Смена будет удалена. Продолжить?'`

      deleteTaskModal.showModal();
    });

    groupButton.appendChild(deleteBtn);

    h2Element.appendChild(groupButton);
    liElement.appendChild(h2Element);

    const innerUlElement = document.createElement('ul');
    innerUlElement.classList.add('tasklist__tasks-list');
    liElement.appendChild(innerUlElement);

    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.classList.add('tasklist__add-task-btn');
    button.innerHTML = '&#10010; Добавить процедуру';
    button.addEventListener('click', () => {
      localStorage.setItem('addTaskTasklistID', this.#tasklistID);
      document.getElementById('modal-add-task').showModal();
    });
    liElement.appendChild(button);

    const adderElement = document.querySelector('.tasklist-adder');
    adderElement.parentElement.insertBefore(liElement, adderElement);
  }
};
