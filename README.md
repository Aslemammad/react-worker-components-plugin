# react-worker-components-plugin ⚡

![](https://img.shields.io/static/v1?label=mode&message=experimental&color=red)

> *something like react server components, but web workers instead of a server*

**react-worker-components-plugin** is a plugin that renders components in web workers and not in the main thread, which helps in rendering blocking components in a non-blocking way.  This project is based on the experimental [react-worker-components](https://github.com/dai-shi/react-worker-components).

- ⚡ Fast
- 💥 Powered by `Suspense`
- 🔥 Easy to use

<br />

You just need to create a file with a name that contains `.worker.`, in case you want to render its components in a Worker. 

## Example 
[Try online (Stackblitz)](https://stackblitz.com/edit/vitejs-vite-eneunr)

### `Fib.worker.tsx`
```tsx
const fib = (i: number): number => {
  const result = i <= 1 ? i : fib(i - 1) + fib(i - 2);
  return result;
};

export const Fib = ({ num, children }) => {
  const fibNum = fib(num); 

  return (
    <div>
      <span>fib of number {num}: {fibNum}</span>
      {children}
    </div>
  );
};
```
### `App.tsx`
```tsx
import { Fib } from './Fib.worker'

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
	      <Fib num={count} />
      </Suspense>
    </div>
  );
}

export default App;

```

![chrome-capture](https://user-images.githubusercontent.com/37929992/153716004-8e4bd404-47ce-4a60-8931-db11018a4967.gif)


## Install
```
npm install -D react-worker-components-plugin
```
 ## Plugins
 ### Vite 
 This plugin for now works in Vite, and it's tested properly there.
 ```js
 // vite.config.js
import { defineConfig } from "vite";
import rwc from "react-worker-components-plugin/vite";

export default defineConfig({
  plugins: [rwc()]
});
```

### Next/Webpack/...
It's planned to support other bundlers, any help is appreciated in that case!

## Contributing 
Please try the plugin, find issues, report and fix them by sending Pull requests and issues! I appreciate that. 
