import React, { useState } from 'react';

export default function AddTaskForm({ onAdd = () => {} }) {
  const [title, setTitle] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
  };

  return (
    <form onSubmit={submit} className="mb-4 flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 p-2 border rounded"
        placeholder="New task title"
      />
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Add</button>
    </form>
  );
}
