import { Routes, Route } from "react-router";
import Home from './Pages/home'
import Login from './Pages/login'
import Dashboard from "./Pages/dashboard";
import Protector from "./Pages/protector";
import Persons from "./Pages/Persons";
import AddPerson from "./Pages/AddPerson";
import SinglePerson from "./Pages/SinglePerson";
import NewNote from "./Pages/NewNote";

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route element={<Protector />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/person" element={<Persons />} />
        <Route path="/person/:id" element={<SinglePerson />} />
        <Route path="/person/add" element={<AddPerson />} />
        <Route path="/post" element={<NewNote />} />
      </Route>

      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
    </Routes>
  )
}

export default App