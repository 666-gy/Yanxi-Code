import React from 'react'
import ReactDOM from 'react-dom/client'
import { TitleBar } from './components/TitleBar/TitleBar'
import './styles/tokens.css'
import './styles/global.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <TitleBar />
      <div style={{flex:1}} />
    </div>
  </React.StrictMode>
)
