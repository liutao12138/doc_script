import React, { useState } from 'react';
import './App.css';

const App: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  const handleIncrement = (): void => {
    setCount(count + 1);
  };

  const handleDecrement = (): void => {
    setCount(count - 1);
  };

  const handleReset = (): void => {
    setCount(0);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>欢迎使用React + TypeScript！</h1>
        <p>这是一个简单的React TypeScript应用示例</p>
        
        <div className="counter-section">
          <h2>计数器示例</h2>
          <p>当前计数: <span className="count">{count}</span></p>
          <div className="button-group">
            <button onClick={handleIncrement}>
              增加
            </button>
            <button onClick={handleDecrement}>
              减少
            </button>
            <button onClick={handleReset}>
              重置
            </button>
          </div>
        </div>

        <div className="info-section">
          <h3>React + TypeScript特性展示</h3>
          <ul>
            <li>✅ 组件化开发</li>
            <li>✅ 状态管理 (useState)</li>
            <li>✅ 事件处理</li>
            <li>✅ TypeScript类型安全</li>
            <li>✅ 现代JavaScript语法</li>
            <li>✅ 智能代码提示</li>
          </ul>
        </div>
      </header>
    </div>
  );
};

export default App;
