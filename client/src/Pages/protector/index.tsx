import { Outlet, useNavigate, NavLink } from "react-router"

import { useState, useEffect } from "react";
import httpClient from "../../libs/api/httpClient";
import cookieClient from "../../libs/utils/cookie";
import { Button } from "../../ui/primitives";


const Protector = () => {
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    
    (async () => {
      const resp = await httpClient.get("/auth/me")

      if (resp.status != 200) {
        return navigate("/login", { replace: true })
      }

      setUser(resp.data)
      setLoaded(true)
    })()

  }, [])

  return loaded ?
    <div>
      <nav style={{  borderBottom: "1px solid #33FF33", display: "flex", justifyContent: "space-between", padding: "4px 8px"}} >

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center"}} >
          <NavLink style={({ isActive }) => ({color: isActive ? "#0066FF" : "#33FF33", textDecoration: "none"})} to="/dashboard" > Dashboard </NavLink>
          <span className="cg" style={{margin: "0 4px"}} > | </span>
          <NavLink style={({ isActive }) => ({color: isActive ? "#0066FF" : "#33FF33", textDecoration: "none"})} to="/memories" > Memories </NavLink>
          <span className="cg" style={{margin: "0 4px"}} > | </span>
          <NavLink style={({ isActive }) => ({color: isActive ? "#0066FF" : "#33FF33", textDecoration: "none"})} to="/person" > Persons </NavLink>
        </div>

        <Button
          onClick={() => {
            cookieClient.delCookie("token")
            navigate("/")
          }}
          className="g-btn"
        > logout </Button>
      </nav>
      <Outlet context={user} />
    </div>
    :
    <h1> loading </h1>

};

export default Protector;