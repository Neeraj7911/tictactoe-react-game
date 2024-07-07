// eslint-disable-next-line no-unused-vars
import React from "react";
import PropTypes from "prop-types";
import "./square.css";

// SVG Icons for X and O
const CircleIcon = () => (
  <svg width="80" height="80" viewBox="0 0 100 100">
    <circle
      cx="50"
      cy="50"
      r="40"
      stroke="white"
      strokeWidth="10"
      fill="none"
    />
  </svg>
);

const CrossIcon = () => (
  <svg width="80" height="80" viewBox="0 0 100 100">
    <line x1="20" y1="20" x2="80" y2="80" stroke="white" strokeWidth="10" />
    <line x1="20" y1="80" x2="80" y2="20" stroke="white" strokeWidth="10" />
  </svg>
);

function Square({ id, value, onClick, className }) {
  const handleClick = () => {
    if (!value) {
      // Only allow clicking if the square is empty
      onClick(id);
    }
  };

  return (
    <div className={`grid-Square ${className}`} onClick={handleClick}>
      {value === "O" && <CircleIcon />}
      {value === "X" && <CrossIcon />}
    </div>
  );
}

Square.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.null]),
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
};

Square.defaultProps = {
  className: "",
};

export default Square;
