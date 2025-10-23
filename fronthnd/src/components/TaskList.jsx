import React from 'react';

export default function TaskList({ tasks = [], onRemove = () => {} }) {
  if (!tasks.length) {
    return <p className="text-center text-gray-500">No tasks yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between bg-white p-3 rounded shadow">
          <span>{task.title}</span>
          <button
            onClick={() => onRemove(task.id)}
            className="text-red-500 hover:underline ml-4"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
