// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";

import { pagesConfig } from "./pages.config";
import PageNotFound from "./lib/PageNotFound";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import mathsContent from "@/components/data/mathsContent";
import TeacherResults from "./pages/TeacherResults";
import StudentLiveQuizPlay from "./pages/StudentLiveQuizPlay.jsx";
import TeacherLiveQuizPlay from "./pages/TeacherLiveQuizPlay.jsx";
import LiveClassroomView from "./pages/LiveClassroomView";
import QuizScheduler from "./pages/QuizScheduler";
import KnowledgeGapReport from "./pages/KnowledgeGapReport";
import ClassKnowledgeGaps from "./pages/ClassKnowledgeGaps";
import AssignmentResults from "./pages/AssignmentResults";
import TestScores from "./pages/TestScores";
import ExamForecast from "./pages/ExamForecast";
import MyTimetable from "./pages/MyTimetable";
import CurriculumManager from "./pages/CurriculumManager";
import GradingCenter from "./pages/GradingCenter";
import StudentGrades from "./pages/StudentGrades";
import CollaborationHub from "./pages/CollaborationHub";
import UsefulTools from "./pages/UsefulTools";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import AttendanceTakeRegister from "./pages/AttendanceTakeRegister";
import AttendanceRegister from "./pages/AttendanceRegister";
import AttendanceStudents from "./pages/AttendanceStudents";
import AttendanceClasses from "./pages/AttendanceClasses";
import AttendanceAnalytics from "./pages/AttendanceAnalytics";
import StudentLobbyRoom from "./pages/StudentLobbyRoom";
import TeacherLobbyPanel from "./pages/TeacherLobbyPanel";
import LiveQuizLobbyNew from "./pages/LiveQuizLobbyNew";
import LiveQuizPlay from "./pages/LiveQuizPlay";

const { Pages, Layout, mainPage } = pagesConfig;

const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/TeacherResults" element={<LayoutWrapper currentPageName="TeacherResults"><TeacherResults /></LayoutWrapper>} />
      <Route path="/LiveClassroomView" element={<LayoutWrapper currentPageName="LiveClassroomView"><LiveClassroomView /></LayoutWrapper>} />
      <Route path="/QuizScheduler" element={<LayoutWrapper currentPageName="QuizScheduler"><QuizScheduler /></LayoutWrapper>} />
      <Route path="/KnowledgeGapReport" element={<LayoutWrapper currentPageName="KnowledgeGapReport"><KnowledgeGapReport /></LayoutWrapper>} />
      <Route path="/ClassKnowledgeGaps" element={<LayoutWrapper currentPageName="ClassKnowledgeGaps"><ClassKnowledgeGaps /></LayoutWrapper>} />
      <Route path="/AssignmentResults" element={<LayoutWrapper currentPageName="AssignmentResults"><AssignmentResults /></LayoutWrapper>} />
      <Route path="/TestScores" element={<LayoutWrapper currentPageName="TestScores"><TestScores /></LayoutWrapper>} />
      <Route path="/ExamForecast" element={<LayoutWrapper currentPageName="ExamForecast"><ExamForecast /></LayoutWrapper>} />
      <Route path="/MyTimetable" element={<LayoutWrapper currentPageName="MyTimetable"><MyTimetable /></LayoutWrapper>} />
      <Route path="/CurriculumManager" element={<LayoutWrapper currentPageName="CurriculumManager"><CurriculumManager /></LayoutWrapper>} />
      <Route path="/GradingCenter" element={<LayoutWrapper currentPageName="GradingCenter"><GradingCenter /></LayoutWrapper>} />
      <Route path="/StudentGrades" element={<LayoutWrapper currentPageName="StudentGrades"><StudentGrades /></LayoutWrapper>} />
      <Route path="/CollaborationHub" element={<LayoutWrapper currentPageName="CollaborationHub"><CollaborationHub /></LayoutWrapper>} />
      <Route path="/StudentLiveQuizPlay" element={<LayoutWrapper currentPageName="StudentLiveQuizPlay"><StudentLiveQuizPlay /></LayoutWrapper>} />
      <Route path="/TeacherLiveQuizPlay" element={<LayoutWrapper currentPageName="TeacherLiveQuizPlay"><TeacherLiveQuizPlay /></LayoutWrapper>} />
      <Route path="/UsefulTools" element={<LayoutWrapper currentPageName="UsefulTools"><UsefulTools /></LayoutWrapper>} />
      <Route path="/att-register" element={<AttendanceRegister />} />
      <Route path="/att-dashboard" element={<AttendanceDashboard />} />
      <Route path="/att-take-register" element={<AttendanceTakeRegister />} />
      <Route path="/att-students" element={<AttendanceStudents />} />
      <Route path="/att-classes" element={<AttendanceClasses />} />
      <Route path="/att-analytics" element={<AttendanceAnalytics />} />
      <Route path="/student-lobby" element={<StudentLobbyRoom />} />
      <Route path="/TeacherLobbyPanel" element={<LayoutWrapper currentPageName="TeacherLobbyPanel"><TeacherLobbyPanel /></LayoutWrapper>} />
      <Route path="/live-quiz-lobby-new" element={<LiveQuizLobbyNew />} />
      <Route path="/live-quiz-play" element={<LiveQuizPlay />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  // Run once when app loads to register all maths content
  useEffect(() => {
    mathsContent.importMathsContent();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;