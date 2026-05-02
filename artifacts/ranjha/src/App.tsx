import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider, useGame } from "@/contexts/GameContext";
import NotFound from "@/pages/not-found";

import Splash from "@/pages/splash";
import Login from "@/pages/login";
import Lobby from "@/pages/lobby";
import Matchmaking from "@/pages/matchmaking";
import Battle from "@/pages/battle";
import MapDetail from "@/pages/map-detail";
import Live from "@/pages/live";
import Profile from "@/pages/profile";
import World from "@/pages/world";

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { profile } = useGame();
  if (!profile) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/lobby"><ProtectedRoute component={Lobby} /></Route>
      <Route path="/matchmaking"><ProtectedRoute component={Matchmaking} /></Route>
      <Route path="/battle"><ProtectedRoute component={Battle} /></Route>
      <Route path="/map/:id"><ProtectedRoute component={MapDetail} /></Route>
      <Route path="/live"><ProtectedRoute component={Live} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      <Route path="/world"><ProtectedRoute component={World} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
