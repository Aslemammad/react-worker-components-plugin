import React from "react";

import { Hello, Hey as Hey1 } from "./Hello.worker";
import { Suspense, useState } from "react";
import "./TextBox";
console.log(Hello, Hey1)

function App() {
  const [count, setCount] = useState(40);
  return (
    <div>
      <h1>Workers</h1>
      <span>Count: {count}</span>
      <button id="increment" type="button" onClick={() => setCount(count + 1)}>
        +1
      </button>
      <button
        id="decrement"
        type="button"
        onClick={() => setCount((c) => c - 1)}
      >
        -1
      </button>

      <Suspense fallback={<div>Loading...</div>}>
        <Hey1 />
        <Hello count={count}></Hello>
      </Suspense>
    </div>
  );
}

export default App;
