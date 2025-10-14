
import { useState } from "react";
import httpClient from "../../libs/api/httpClient";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import toastMaker from '../../libs/utils/custom-toast'
import cookieClient from "../../libs/utils/cookie";
import { Button, Input } from "../../ui/primitives";

export default () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOTP] = useState("")

  const submitStepOne = async () => {
    const resp = await httpClient.post("/auth/request-otp", {
      "phone_number": phoneNumber
    })

    if (resp.status != 200) return toastMaker.error("bad phone number")

    setStep(2)
    toastMaker.success("check your phone for otp")
  }

  const submitStepTwo = async () => {
    const resp = await httpClient.post("/auth/verify-otp", {
      "phone_number": phoneNumber,
      otp
    })

    if (resp.status == 400) return toastMaker.error("please check your data")
    if (resp.status == 401) return toastMaker.error("code mismatch")
    if (resp.status == 200) {

      cookieClient.setCookie("token", resp.data.token, 24 * 30)
      toastMaker.success("welcome")
      navigate("/dashboard")
      
    }

  }

  // #todo should redirect to dashboard if it is already logged ins 

  return (
    <div>
      <div
        className="border-g cg"
        style={{
        width: 400,
          maxWidth: "80%",
        textAlign: "center",
        margin: '20px auto',
        borderRadius: 12
      }} >
        <br />
        <h2>Login</h2>
        <br />

        <div style={{display: "flex", alignItems: "center"}} >
          <label style={{flex: .35}} >phonenumber </label>
          <Input
            style={{flex: .65}}
            type="tel"
            value={phoneNumber}
            readOnly={step == 2}
            onChange={({ target: { value } }) => setPhoneNumber(value)}
          />
        </div>

          {
            step == 1 ?
            <>
              <Button
                onClick={() => submitStepOne()}
              >
                submit
              </Button>  
              <br />
            </>
              :
              <>
                <div style={{ display: "flex", alignItems: "center" }} >
                  <label style={{flex: .35}} >otp </label>
                  <Input
                    style={{flex: .65}}
                    type="text"
                    value={otp}
                    onChange={({ target: { value } }) => setOTP(value)}
                  />
              </div>
              <br />

                <Button
                  onClick={() => submitStepTwo()}
                >
                  submit
                </Button>
              </>
          }

      </div>
    </div>
  )
}