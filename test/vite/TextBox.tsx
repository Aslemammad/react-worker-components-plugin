import React, { useState } from 'react';

export const TextBox = () => {
  const [text, setText] = useState('');
  return (
    <div>
      <span>Text: {text}</span>
      <input value={text} onChange={(event) => setText(event.target.value)} />
    </div>
  );
};

