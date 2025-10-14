import { useEffect } from "react";
import { useNavigate } from "react-router";
import cookieClient from "../../libs/utils/cookie";

export default function Home() {

  const navigate = useNavigate();

  useEffect(() => {
    cookieClient.getCookie("token") ? navigate("/dashboard") :  navigate("/login")
  }, [navigate]);

  return <h1>Loading...</h1>

}
