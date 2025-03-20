import { useState } from "react"
import httpClient from "../../utils/http"
import { useNavigate } from "react-router";
import toastMaker from "../../utils/custom-toast";

export default () => {
  const navigate = useNavigate();

  const [name, setName] = useState("")

  const submit = async () => {

    if (!name) return toastMaker.error("name is required")

    const resp = await httpClient.post("/person/", {
      name
    })

    if (resp.status == 200) {
      toastMaker.success("new person created")
      return navigate("/person")
    } else if (resp.status == 400) {
      return toastMaker.error("this person already exists")
    }

  }

  return (
    <div>
      <div style={{
        width: 300,
        background: "#000",
        border: "1px solid #33ff33",
        textAlign: "center",
        margin: '20px auto',
        borderRadius: 12,
        color: "#33ff33"
      }} >
        <br />
        <h2>Add Person</h2>

        <label> name </label>
        <input
          className="g-inp"
          type="tel"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          style={{ padding: '4px 8px' }}
        />
        <br />
        <button
          className="g-btn"
          style={{ padding: '4px 8px' }}
          onClick={() => submit()}
        >
          submit
        </button>
        <br />
        <br />
      </div>
    </div>
  )
}