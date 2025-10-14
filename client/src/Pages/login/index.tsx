import { useState } from "react"
import { useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
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

  const requestOtpMutation = useMutation({
      mutationFn:    (phone: string) =>
      httpClient.post("/auth/request-otp", {
        phone_number: phone,
      }),
      onSuccess: (resp) => {
        if (resp?.status !== 200) {
          toastMaker.error("bad phone number")
          return
        }

        setStep(2)
        toastMaker.success("check your phone for otp")
      },
      onError: () => {
        toastMaker.error("network error")
      },
    })

  const verifyOtpMutation = useMutation({
      mutationFn:     (payload: { phone: string; otp: string }) =>
      httpClient.post("/auth/verify-otp", {
        phone_number: payload.phone,
        otp: payload.otp,
      }),
      onSuccess: (resp) => {
        if (resp?.status === 400) {
          toastMaker.error("please check your data")
          return
        }
        if (resp?.status === 401) {
          toastMaker.error("code mismatch")
          return
        }
        if (resp?.status === 200) {
          cookieClient.setCookie("token", resp.data.token, 24 * 30)
          toastMaker.success("welcome")
          navigate("/dashboard")
          return
        }

        toastMaker.error("unexpected error")
      },
      onError: () => {
        toastMaker.error("network error")
      },
    })

  const submitStepOne = async () => {
    await requestOtpMutation.mutateAsync(phoneNumber)
  }

  const submitStepTwo = async () => {
    await verifyOtpMutation.mutateAsync({ phone: phoneNumber, otp })
  }

  // #todo should redirect to dashboard if it is already logged in

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full flex flex-col items-center gap-4 max-w-md rounded-xl shadow-lg p-2 border-2 border-[#33FF33]">
        <Typography variant="h1" >
          Login
        </Typography>

          <div className="flex items-center gap-4">
            <Typography variant="body" className="w-1/2">
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
              <Button
              className="w-full"
                onClick={submitStepOne}
                disabled={requestOtpMutation.isPending}
              >
                <Typography as="span">Submit</Typography>
              </Button>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-4">
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
              className="w-full"
                onClick={submitStepTwo}
                disabled={verifyOtpMutation.isPending}
              >
                <Typography as="span">Submit</Typography>
              </Button>
            </div>
          )}
        </div>
    </div>
  )
}