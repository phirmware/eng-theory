import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from '@/pages/Home'
import SectionPage from '@/pages/SectionPage'
import Session from '@/pages/Session'
import Results from '@/pages/Results'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/section/:id" element={<SectionPage />} />
        <Route path="/session" element={<Session />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}
