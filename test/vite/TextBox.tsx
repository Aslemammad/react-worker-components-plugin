import React, { useState } from 'react';

import { register } from 'react-worker-components-plugin/rwc';

export const TextBox = () => {
  const [text, setText] = useState('');
  return (
    <div>
      <span>Text: {text}</span>
      <input value={text} onChange={(event) => setText(event.target.value)} />
    </div>
  );
};

register(TextBox, 'TextBox');
