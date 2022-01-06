import React from "react";

import Hello from "./Hello.worker?worker";
import { Suspense, useState } from "react";
// import { wrap } from "react-worker-components";
import { TextBox } from "./TextBox";

// const Hello = wrap(() => new MyWorker());
console.log(new Hello);

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
    </div>
  );
}

export default App;
