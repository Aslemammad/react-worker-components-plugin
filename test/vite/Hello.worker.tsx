import React from "react";

// import { expose } from "react-worker-components";

import { TextBox } from "./TextBox";

const fib = (i: number): number => {
  const result = i <= 1 ? i : fib(i - 1) + fib(i - 2);
  return result;
};

export const Hello: React.FC<{ count: number }> = ({ count, children }) => {
  const fibNum = fib(count);

  return (
    <div>
      <div>Hello from worker: {fibNum}</div>
      <h1>Main TextBox</h1>
      {children}
      <h1>Worker TextBox</h1>
      <TextBox />
    </div>
  );
};

export const Hey: React.FC = () => {
  return (
    <div>
      <h1>Hey from worker</h1>
    </div>
  );
};

// expose(Hello);
