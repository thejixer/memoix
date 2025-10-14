import { useEffect, useState } from "react";
import ProfileCard from "./card";
import httpClient from "../../libs/api/httpClient";

interface Person {
  id: string;
  name: string;
  avatar?: string;
}

const PersonsList: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await httpClient.get("/person/");
        if (resp.status === 200 && resp.data) {
          console.log(resp.data);
          setPersons(resp.data);
        }
      } catch (err) {
        console.error("Failed to fetch persons:", err);
      }
    })();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        textAlign: "center",
        textDecoration: "none",
        flexWrap: "wrap",
        paddingBottom: 20,
      }}
    >
      {persons.map((p) => (
        <ProfileCard
          key={p.id}
          id={p.id}
          name={p.name}
          // avatar={p.avatar ? `${Domain}/${p.avatar}` : "/logo.webp"}
          avatar={p.avatar ? `/${p.avatar}` : "/logo.webp"}
        />
      ))}
    </div>
  );
};

export default PersonsList;
