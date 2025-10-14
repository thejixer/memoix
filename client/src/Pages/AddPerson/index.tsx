import { useState } from "react"
import { useNavigate } from "react-router";
import toastMaker from "../../libs/utils/custom-toast";
import { Button, Input } from "../../ui/primitives";
import { post } from "../../libs/api/requestHandler"
import { Routes } from "../../libs/api/routes"
import { useMutation } from "@tanstack/react-query"

export default function AddPerson() {
  const navigate = useNavigate();

  const [name, setName] = useState("")

  const createPersonMutation = useMutation({
    mutationFn: (body: TServices.CreatePersonBody) =>
      post<TServices.CreatePersonBody, any>(Routes.PERSON_CREATE, body),
    onSuccess: (resp) => {
      if (resp.status == 200) {
        toastMaker.success("new person created")
        return navigate("/person")
      } else if (resp.status == 400) {
        return toastMaker.error("this person already exists")
      }
    },
    onError: () => {
      toastMaker.error("network error")
    },
  })

  const submit = async () => {

    if (!name) return toastMaker.error("name is required")

    await createPersonMutation.mutateAsync({ name })

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
        <Input
          type="tel"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          style={{ padding: '4px 8px' }}
        />
        <br />
        <Button
          style={{ padding: '4px 8px' }}
          onClick={() => submit()}
        >
          submit
        </Button>
        <br />
        <br />
      </div>
    </div>
  )
}