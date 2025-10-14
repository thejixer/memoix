import React from "react";
import { Link } from "react-router";
import "./card.css";

interface ProfileCardProps {
  id: string;
  name: string;
  avatar?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ id, name, avatar }) => {
  return (
    <Link to={`/person/${id}`} style={{ textDecoration: "none" }}>
      <div className="profile-card">
        <img
          src={avatar ?? "/logo.webp"}
          alt={name}
          className="avatar"
          onError={e => {
            const target = e.target as HTMLImageElement;
            target.src = "/logo.webp";
          }}
        />
        <h3 className="name">{name}</h3>
      </div>
    </Link>
  );
};

export default ProfileCard;
