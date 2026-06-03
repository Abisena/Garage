import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

const rootElement = document.getElementById('root')
const appTree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

ReactDOM.createRoot(rootElement).render(
  import.meta.env.DEV ? <React.StrictMode>{appTree}</React.StrictMode> : appTree
)
