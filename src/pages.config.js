/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AITutor from './pages/AITutor';
import AdminPanel from './pages/AdminPanel';
import AdminSeedQuestions from './pages/AdminSeedQuestions';
import Analytics from './pages/Analytics';
import AssignmentBuilder from './pages/AssignmentBuilder';
import AssignmentDue from './pages/AssignmentDue';
import ClassDetails from './pages/ClassDetails';
import CreateQuiz from './pages/CreateQuiz';
import ImportMathsContent from './pages/ImportMathsContent';
import JoinClass from './pages/JoinClass';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';
import Onboarding from './pages/Onboarding';
import PracticeQuizPlay from './pages/PracticeQuizPlay';
import PracticeQuizResults from './pages/PracticeQuizResults';
import QuestionBank from './pages/QuestionBank';
import QuizLibrary from './pages/QuizLibrary';
import StartLiveQuiz from './pages/StartLiveQuiz';
import StudentClassDetail from './pages/StudentClassDetail';
import StudentDashboard from './pages/StudentDashboard';
import StudentLiveQuizPlay from './pages/StudentLiveQuizPlay';
import StudentStats from './pages/StudentStats';
import Subject from './pages/Subject';
import TakeAssignment from './pages/TakeAssignment';
import TeacherAssignmentLibrary from './pages/TeacherAssignmentLibrary';
import TeacherClassDetail from './pages/TeacherClassDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLiveQuizLobby from './pages/TeacherLiveQuizLobby';
import TeacherLiveQuizPlay from './pages/TeacherLiveQuizPlay';
import TeacherLiveQuizResults from './pages/TeacherLiveQuizResults';
import TeacherQuestionBuilder from './pages/TeacherQuestionBuilder';
import TeacherQuestionGenerator from './pages/TeacherQuestionGenerator';
import Topic from './pages/Topic';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITutor": AITutor,
    "AdminPanel": AdminPanel,
    "AdminSeedQuestions": AdminSeedQuestions,
    "Analytics": Analytics,
    "AssignmentBuilder": AssignmentBuilder,
    "AssignmentDue": AssignmentDue,
    "ClassDetails": ClassDetails,
    "CreateQuiz": CreateQuiz,
    "ImportMathsContent": ImportMathsContent,
    "JoinClass": JoinClass,
    "Landing": Landing,
    "Lesson": Lesson,
    "Onboarding": Onboarding,
    "PracticeQuizPlay": PracticeQuizPlay,
    "PracticeQuizResults": PracticeQuizResults,
    "QuestionBank": QuestionBank,
    "QuizLibrary": QuizLibrary,
    "StartLiveQuiz": StartLiveQuiz,
    "StudentClassDetail": StudentClassDetail,
    "StudentDashboard": StudentDashboard,
    "StudentLiveQuizPlay": StudentLiveQuizPlay,
    "StudentStats": StudentStats,
    "Subject": Subject,
    "TakeAssignment": TakeAssignment,
    "TeacherAssignmentLibrary": TeacherAssignmentLibrary,
    "TeacherClassDetail": TeacherClassDetail,
    "TeacherDashboard": TeacherDashboard,
    "TeacherLiveQuizLobby": TeacherLiveQuizLobby,
    "TeacherLiveQuizPlay": TeacherLiveQuizPlay,
    "TeacherLiveQuizResults": TeacherLiveQuizResults,
    "TeacherQuestionBuilder": TeacherQuestionBuilder,
    "TeacherQuestionGenerator": TeacherQuestionGenerator,
    "Topic": Topic,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};