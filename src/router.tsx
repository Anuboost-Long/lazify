import { createBrowserRouter } from "react-router-dom";

import RootLayout from "@/layouts/RootLayout";
import AboutRoute from "@/routes/AboutRoute";
import HomeRoute from "@/routes/HomeRoute";

// Add new top-level routes as siblings here; nest under a parent route only
// when routes genuinely share layout beyond RootLayout.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: "about", element: <AboutRoute /> }
    ]
  }
]);
