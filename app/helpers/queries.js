const queries = {
    'INSERT_TODO': 'INSERT INTO todo.todo (name,  user_id, chat_id) VALUES ($1, $2, $3);',
    'CHECK_IF_USER_EXIST': 'SELECT * FROM todo.user_management where id= $1',
    'CHECK_IF_CHAT_EXIST': 'SELECT * FROM todo.chat where id= $1',
    'ADD_CHAT': 'INSERT INTO todo.chat (id) VALUES ($1)',
    'ADD_USER': 'INSERT INTO todo.user_management (id) VALUES ($1)',
    'SHOW_TODOS': 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2',
    'SET_TODO_FINISH': 'UPDATE todo.todo SET is_finished=true WHERE id = $1',
    'GET_UNFINSHED_TODOS': 'SELECT * FROM todo.todo WHERE todo.chat_id = $1 AND todo.is_finished = $2'
}


module.exports = queries;