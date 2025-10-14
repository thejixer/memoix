import { useState } from "react"
import { useNavigate } from "react-router"
import toast from "react-hot-toast"
import httpClient from "../../libs/api/httpClient"
import toastMaker from '../../libs/utils/custom-toast'
import cookieClient from "../../libs/utils/cookie"
import { Button, Input, Typography } from "../../ui/primitives"

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOTP] = useState("")

  const submitStepOne = async () => {
    const resp = await httpClient.post("/auth/request-otp", {
      "phone_number": phoneNumber
    })

    if (resp.status !== 200) return toastMaker.error("bad phone number")

    setStep(2)
    toastMaker.success("check your phone for otp")
  }

  const submitStepTwo = async () => {
    const resp = await httpClient.post("/auth/verify-otp", {
      "phone_number": phoneNumber,
      otp
    })

    if (resp.status === 400) return toastMaker.error("please check your data")
    if (resp.status === 401) return toastMaker.error("code mismatch")
    if (resp.status === 200) {
      cookieClient.setCookie("token", resp.data.token, 24 * 30)
      toastMaker.success("welcome")
      navigate("/dashboard")
    }
  }

  // #todo should redirect to dashboard if it is already logged in

  return (
    <div className="min-h-screen flex items-center justify-center p-4 ">
      <div className="flex flex-col gap-3 w-full max-w-mdrounded-xl shadow-lg p-2 border-[#33FF33] border-2">
        <Typography variant="h1" className="text-center mx-auto " >
          Login
        </Typography>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Typography variant={"body"} className="w-1/2">
              Phone Number
            </Typography>
            <Input
              className="w-1/2"
              type="tel"
              value={phoneNumber}
              readOnly={step === 2}
              onChange={({ target: { value } }) => setPhoneNumber(value)}
            />
          </div>

          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <Button
                onClick={submitStepOne}
              >
                <Typography as="span">Submit</Typography>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Typography variant="body" className="w-1/2">
                  OTP
                </Typography>
                <Input
                  className="w-1/2"
                  type="text"
                  value={otp}
                  onChange={({ target: { value } }) => setOTP(value)}
                />
              </div>

              <Button
                onClick={submitStepTwo}
              >
                <Typography as="span">Submit</Typography>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}