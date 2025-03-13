import React from "react";
import "./card.css";
import {  Link } from "react-router";


const ProfileCard = ({ name, avatar, id }) => {
  return (
    <Link to={`/person/${id}`} style={{textDecoration: "none"}} >
      <div className="profile-card">
        <img
          src={avatar}
          alt={name}
          className="avatar" 
          onError={e => {
            if (e.target) {
              e.target.src = "/logo.webp"
            }
          }}  
        />
        <h3 className="name">{name}</h3>
      </div>
      
    </Link>
  );
};

export default ProfileCard;
