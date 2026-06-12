import React, { useState } from "react";
import RJPChatGPT from "./RJPChatGPT";
import "./RJPChatGPTFloating.css";

export default function RJPChatGPTFloating(props) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button className="rjp-chatgpt-floating" onClick={() => setShow(!show)}>
        🤖
      </button>
      {show && (
        <div className="rjp-chatgpt-floating-panel">
          <RJPChatGPT {...props} />
        </div>
      )}
    </>
  );
}
