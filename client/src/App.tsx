import { Routes, Route } from "react-router";
import Home from './Pages/home'
import Login from './Pages/login'
import Protector from "./Pages/protector";
import Memories from "./Pages/Memories";
import SinglePerson from "./Pages/SinglePerson";
import PersonsList from "./Pages/Persons";
import AddPerson from "./Pages/AddPerson";
import Dashboard from "./Pages/dashboard";

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route element={<Protector />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/person" element={<PersonsList />} />
        <Route path="/person/:id" element={<SinglePerson />} />
        <Route path="/person/add" element={<AddPerson />} />
        <Route path="/memories" element={<Memories />} />
      </Route>

      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
    </Routes>
  )
}

export default App