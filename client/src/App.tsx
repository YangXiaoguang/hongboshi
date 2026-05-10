import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import LoginModal from "./components/LoginModal";
import Assessment from "./pages/Assessment";
import Consulting from "./pages/Consulting";
import CounselorWorkbench from "./pages/CounselorWorkbench";
import CourseDetail from "./pages/CourseDetail";
import Home from "./pages/Home";
import MyCourses from "./pages/MyCourses";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/courses/:courseId"} component={CourseDetail} />
      <Route path={"/consulting"} component={Consulting} />
      <Route path={"/counselor/workbench"} component={CounselorWorkbench} />
      <Route path={"/assessment"} component={Assessment} />
      <Route path={"/me/courses"} component={MyCourses} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <LoginModal />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
