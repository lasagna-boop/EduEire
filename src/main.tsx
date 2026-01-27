//main.tsx for initialising the entire thing
import "bootstrap/dist/css/bootstrap.min.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client"; //react to DOM endpoint
import { BrowserRouter } from "react-router-dom"; //single page navigation
import App from "./App"; //root component
import "./styles/layout.css";  //layout styling
import "./styles/feed.css"

//react app goes inside root div id from index.html
createRoot(document.getElementById("root")!).render( 
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);