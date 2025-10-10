import { useEffect, useState } from "react";
import { Link } from "react-router";
import httpClient from "../../utils/http";
import ProfileCard from "./card";


export default () => {

  const [persons, setPersons] = useState([])

  useEffect(() => {
    (async () => {
      const resp = await httpClient.get("/person/")

      if (resp.status == 200 && resp.data) {
        console.log(resp.data)
        setPersons(resp.data)
      }
    })()
  }, [])

  return (
    <div>
      <Link
        to="/person/add"
        className="g-btn"
        style={{ display: "inline-block", color: "#33ff33", textDecoration: "none", margin: 8 }}
      >
        Add Person
      </Link>
      <div style={{ display: "flex", textAlign: "center", textDecoration: "none", flexWrap: "wrap", paddingBottom: 20 }} >
        {persons.map(p => <ProfileCard key={p.id} name={p.name} id={p.id} avatar={p.avatar ? `${Domain}/${p.avatar}` : "/logo.webp"} />)}
      </div>
    </div>
  )
}