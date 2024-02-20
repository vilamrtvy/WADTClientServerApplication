import Tasklist from './Tasklist';
import AppModel from '../model/AppModel';

export default class App {
  #tasklists = [];

  onEscapeKeydown = (event) => {
    if (event.key === 'Escape') {
      const input = document.querySelector('.tasklist-adder__input');
      input.style.display = 'none';
      input.value = '';

      document.querySelector('.tasklist-adder__btn')
        .style.display = 'inherit';
    }
  }

  onInputKeydown = async (event) => {
    if (event.key !== 'Enter') return;

    if (event.target.value) {
      const tasklistID = crypto.randomUUID();

      try {
        const addTasklistResult = await AppModel.addTasklist({
          tasklistID, 
          name: event.target.value,
          position: this.#tasklists.length
        });

        const newTasklist = new Tasklist({
          tasklistID, 
          name: event.target.value,
          position: this.#tasklists.length,
          onDropTaskInTasklist: this.onDropTaskInTasklist,
          addNotification: this.addNotification
        });

        this.#tasklists.push(newTasklist);
        newTasklist.render();

        this.addNotification({ text: 'Сеанс успешно давлен', type: 'success' });
      } catch(err) {
        this.addNotification({ text: err.message, type: 'error' });
        console.error(err);
      }
    }

    event.target.style.display = 'none';
    event.target.value = '';

    document.querySelector('.tasklist-adder__btn')
      .style.display = 'inherit';
  }

  onDropTaskInTasklist = async (evt) => {
    evt.stopPropagation();

    const destTasklistElement = evt.currentTarget;
    destTasklistElement.classList.remove('tasklist_droppable');

    const movedTaskID = localStorage.getItem('movedTaskID');
    const srcTasklistID = localStorage.getItem('srcTasklistID');
    const destTasklistID = destTasklistElement.getAttribute('id');

    localStorage.setItem('movedTaskID', '');
    localStorage.setItem('srcTasklistID', '');

    if (!destTasklistElement.querySelector(`[id="${movedTaskID}"]`)) return;

    const srcTasklist = this.#tasklists.find(tasklist => tasklist.tasklistID === srcTasklistID);
    const destTasklist = this.#tasklists.find(tasklist => tasklist.tasklistID === destTasklistID);

    try {
      if (srcTasklistID !== destTasklistID) {
        await AppModel.moveTask({ taskID: movedTaskID, srcTasklistID, destTasklistID });
        
        const movedTask = srcTasklist.deleteTask({ taskID: movedTaskID });
        destTasklist.pushTask({ task: movedTask });

        await srcTasklist.reorderTasks();
      }

      await destTasklist.reorderTasks();

      this.addNotification({ text: `Сеанс успешно перенес`, type: 'success' });
    } catch (err) {
      this.addNotification({ text: `${err.message}`, type: 'error' });
      console.error(err);
    }
  }

  
  editTask = async ({ taskID, newTaskText }) => {
    let fTask = null;
    for (let tasklist of this.#tasklists) {
      fTask = tasklist.getTaskById({ taskID });
      if (fTask) break;
    }

    const curTaskText = fTask.taskText;
    if (!newTaskText || newTaskText === curTaskText) return;

    try {
      const updateTaskResult = await AppModel.updateTask({ taskID, text: newTaskText });

      fTask.taskText = newTaskText;
      document.querySelector(`[id="${taskID}"] span.task__text`).innerHTML = newTaskText;

      this.addNotification({ text: updateTaskResult.message, type: 'success'});
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error'});
      console.error(err);
    }
  }

  deleteTask = async ({ taskID }) => {
    let fTask = null;
    let fTasklist = null;
    for (let tasklist of this.#tasklists) {
      fTasklist = tasklist;
      fTask = tasklist.getTaskById({ taskID });
      if (fTask) break;
    }

    try {
      const deleteTaskResult = await AppModel.deleteTask({ taskID });

      document.getElementById(taskID).remove();

      this.addNotification({ text: deleteTaskResult.message, type: 'success' });
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  }

  deleteTasklist = async ({ tasklistID }) => {
    try {
      const deleteTasklistResult = await AppModel.deleteTasklist({ tasklistID });
      
      document.getElementById(tasklistID).remove();

      this.addNotification({ text: deleteTasklistResult.message, type: 'success' });
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  }

  editTasklist = async ({ tasklistID, newTasklistName }) => {
    try {
      const editTasklistResult = await AppModel.editTasklist({ tasklistID, name: newTasklistName });

      document.querySelector(`[id="${tasklistID}"] h2.tasklist__name`).innerHTML = newTasklistName;

      this.addNotification({ text: editTasklistResult.message, type: 'success'});
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error'});
      console.error(err);
    }
  }

  getProceduresList = async () => {
    try {
      const getProcedures = await AppModel.getProcedures();
      return getProcedures;
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  }

  async initAddTaskModal() {
    const addTaskModal = document.getElementById('modal-add-task');

    const selectElement = document.getElementById('modal-add-task-select');
    selectElement.innerHTML = '';

    const getProcedures = await this.getProceduresList();

    const keys = Object.keys(getProcedures.procedures[1]);

    for (const key in getProcedures.procedures) {
      const option = getProcedures.procedures[key];
      const optionElement = document.createElement('option');

      const procedureID = option.procedureID;
      const procedureName = option.name;
      const procedureWeight = option.weight;

      optionElement.value = procedureID;
      optionElement.textContent = `${procedureName} [${procedureWeight} минут]`;
      selectElement.appendChild(optionElement);
    }

    const cancelHandler = () => {
      addTaskModal.close();
      localStorage.setItem('addTaskTasklistID', '');
      addTaskModal.querySelector('.app-modal__input').value = '';
    };

    const okHandler = () => {
      const tasklistID = localStorage.getItem('addTaskTasklistID');
      const modalInput = addTaskModal.querySelector('.app-modal__input');
      const procedureInput = addTaskModal.querySelector('.app-modal__select');

      if (tasklistID && modalInput.value && procedureInput.value && procedureInput.selectedOptions[0].textContent) {
        this.#tasklists.find(tasklist => tasklist.tasklistID === tasklistID)
          .appendNewTask({
            text: modalInput.value,
            procedureID: procedureInput.value,
            procedureText: procedureInput.selectedOptions[0].textContent });
      }

      cancelHandler();
    };

    addTaskModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
    addTaskModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
    addTaskModal.addEventListener('close', cancelHandler);
  }

  async initEditTaskModal() {
    const editTaskModal = document.getElementById('modal-edit-task');

    const getProcedures = await this.getProceduresList();

    for (const key in getProcedures.procedures) {
      const option = getProcedures.procedures[key];
      const optionElement = document.createElement('option');

      const procedureID = option.procedureID;
      const procedureName = option.name;
      const procedureWeight = option.weight;

      optionElement.value = procedureID;
      optionElement.textContent = `${procedureName} [${procedureWeight} минут]`;
      selectElement.appendChild(optionElement);
    }

    const cancelHandler = () => {
      editTaskModal.close();
      localStorage.setItem('editTaskID', '');
      editTaskModal.querySelector('.app-modal__input').value = '';
    };

    const okHandler = () => {
      const taskID = localStorage.getItem('editTaskID');
      const modalInput = editTaskModal.querySelector('.app-modal__input');
      const procedureInput = editTaskModal.querySelector('.app-modal__select');

      if (taskID && modalInput.value && procedureInput.value && procedureInput.textContent) {
        this.editTask({ 
          taskID, 
          newTaskText: modalInput.value, 
          procedureId: procedureInput.value,
          procedureText: procedureInput.textContent });
      }

      cancelHandler();
    };

    editTaskModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
    editTaskModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
    editTaskModal.addEventListener('close', cancelHandler);
  }

  initDeleteTaskModal() {
    const deleteTaskModal = document.getElementById('modal-delete-task');

    const cancelHandler = () => {
      deleteTaskModal.close();
      localStorage.setItem('deleteTaskID', '');
    };

    const okHandler = () => {
      const taskID = localStorage.getItem('deleteTaskID');

      if (taskID) {
        this.deleteTask({ taskID });
      }

      cancelHandler();
    };

    deleteTaskModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
    deleteTaskModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
    deleteTaskModal.addEventListener('close', cancelHandler);
  }

  initDeleteTasklistModal() {
    const deleteTasklistModal = document.getElementById('modal-delete-task');

    const cancelHandler = () => {
      deleteTasklistModal.close();
      localStorage.setItem('deleteTasklistID', '');
    };

    const okHandler = () => {
      const tasklistID = localStorage.getItem('deleteTasklistID');

      if (tasklistID) {
        this.deleteTasklist({ tasklistID });
      }

      cancelHandler();
    };

    deleteTasklistModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
    deleteTasklistModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
    deleteTasklistModal.addEventListener('close', cancelHandler);
  }

  initEditTasklistModal() {
    const editTasklistModal = document.getElementById('modal-edit-task');

    const cancelHandler = () => {
      editTasklistModal.close();
      localStorage.setItem('editTasklistID', '');
      editTasklistModal.querySelector('.app-modal__input').value = '';
    };

    const okHandler = () => {
      const tasklistID = localStorage.getItem('editTasklistID');
      const modalInput = editTasklistModal.querySelector('.app-modal__input');

      if (tasklistID && modalInput.value) {
        this.editTasklist({ tasklistID, newTasklistName: modalInput.value });
      }

      cancelHandler();
    };

    editTasklistModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
    editTasklistModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
    editTasklistModal.addEventListener('close', cancelHandler);
  }

  initNotifications() {
    const notifications = document.getElementById('app-notifications');
    notifications.show();
  }

  addNotification = ({ text, type }) => {
    const notifications = document.getElementById('app-notifications');

    const notificationID = crypto.randomUUID();
    const notification = document.createElement('div');
    notification.classList.add(
      'notification',
      type === 'success' ? 'notification-success' : 'notification-error'
    );

    notification.setAttribute('id', notificationID);
    notification.innerHTML = text;

    notifications.appendChild(notification);

    setTimeout(() => { document.getElementById(notificationID).remove(); }, 5000);
  }

  countDuration = async ({ draggedTask, currentTask }) => {
    try {
      const countDurationResult = await AppModel.countDurationTasklist({ draggedTask, currentTask });
      return countDurationResult
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  }

  async init() {
    // top button
    document.querySelector('.tasklist-adder__btn')
      .addEventListener(
        'click',
        (event) => {
          event.target.style.display = 'none';

          const input = document.querySelector('.tasklist-adder__input');
          input.style.display = 'inherit';
          input.focus();
        }
      );

    document.addEventListener('keydown', this.onEscapeKeydown);

    document.querySelector('.tasklist-adder__input')
      .addEventListener('keydown', this.onInputKeydown);


    // theme-switch
    document.getElementById('theme-switch')
      .addEventListener('change', (evt) => {
        (evt.target.checked
          ? document.body.classList.add('dark-theme')
          : document.body.classList.remove('dark-theme'));
      });

    let notificationShown = 0;

    this.initAddTaskModal();
    this.initEditTaskModal();
    this.initDeleteTaskModal();
    this.initDeleteTasklistModal();
    this.initEditTasklistModal();
    this.initNotifications();

    document.addEventListener('dragover', async (evt) => {
      evt.preventDefault();

      const draggedElement = document.querySelector('.task.task_selected');
      const draggedElementPrevList = draggedElement.closest('.tasklist');

      const currentElement = evt.target;
      const prevDroppable = document.querySelector('.tasklist_droppable');
      let curDroppable = evt.target;
      while (!curDroppable.matches('.tasklist') && curDroppable !== document.body) {
        curDroppable = curDroppable.parentElement;
      }

      if (curDroppable !== prevDroppable) {
        if (prevDroppable) prevDroppable.classList.remove('tasklist_droppable');

        if (curDroppable.matches('.tasklist')) {
          curDroppable.classList.add('tasklist_droppable');
        }
      }

      if (!curDroppable.matches('.tasklist') || draggedElement === currentElement) return;

      if (curDroppable === draggedElementPrevList) {
        if (!currentElement.matches('.task')) return;

        const nextElement = (currentElement === draggedElement.nextElementSibling)
          ? currentElement.nextElementSibling
          : currentElement;

        curDroppable.querySelector('.tasklist__tasks-list')
          .insertBefore(draggedElement, nextElement);

        return;
      }

      // ЭТО ТО ЧТО НУЖНО
      if (currentElement.matches('.task')) {
        const tasklist = curDroppable.querySelector('.tasklist__tasks-list');

        const durationResults = await this.countDuration({ draggedTask: draggedElement.id, currentTask: currentElement.id} );

        const TaskDuration = Number(durationResults.task);
        const TasklistDuration = Number(durationResults.tasklist);
      
        if (TaskDuration + TasklistDuration <= 240) {
          tasklist.insertBefore(draggedElement, currentElement);
        } else {
          if (notificationShown === 0) {
            this.addNotification({ text: 'ПРЕВЫШЕНА ДЛИТЕЛЬНОСТЬ РАБОЧЕГО ДНЯ', type: 'success' });
            notificationShown = 1; 
          }
        }
      
        return;
      }
  
      if (!curDroppable.querySelector('.tasklist__tasks-list').children.length) {
        curDroppable.querySelector('.tasklist__tasks-list')
          .appendChild(draggedElement);
      }
    });

    try {
      const tasklists = await AppModel.getTasklists();

      for (const tasklist of tasklists) {
        const tasklistObj = new Tasklist({
          tasklistID: tasklist.tasklistID,
          name: tasklist.name,
          position: tasklist.position,
          duration: tasklist.duration,
          onDropTaskInTasklist: this.onDropTaskInTasklist,
          addNotification: this.addNotification
        })

        this.#tasklists.push(tasklistObj);
        tasklistObj.render();

        for (const task of tasklist.tasks) {
            tasklistObj.addNewTaskLocal({
              taskID: task.taskID, 
              text: task.text,
              position: task.position,
              procedure: task.procedure
            })
        }
      }
    } catch(err) {
      this.addNotification({ text: err.message, type: 'error' });
      console.error(err);
    }
  }
}
