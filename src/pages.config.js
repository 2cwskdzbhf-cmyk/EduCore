import AITutor from './pages/AITutor';
import AdminPanel from './pages/AdminPanel';
import ClassDetails from './pages/ClassDetails';
import CreateAssignment from './pages/CreateAssignment';
import CreateQuiz from './pages/CreateQuiz';
import ImportMathsContent from './pages/ImportMathsContent';
import JoinClass from './pages/JoinClass';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';
import Onboarding from './pages/Onboarding';
import Quiz from './pages/Quiz';
import QuizLibrary from './pages/QuizLibrary';
import StartLiveQuiz from './pages/StartLiveQuiz';
import StudentStats from './pages/StudentStats';
import Subject from './pages/Subject';
import TeacherDashboard from './pages/TeacherDashboard';
import Topic from './pages/Topic';
import StudentDashboard from './pages/StudentDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITutor": AITutor,
    "AdminPanel": AdminPanel,
    "ClassDetails": ClassDetails,
    "CreateAssignment": CreateAssignment,
    "CreateQuiz": CreateQuiz,
    "ImportMathsContent": ImportMathsContent,
    "JoinClass": JoinClass,
    "Landing": Landing,
    "Lesson": Lesson,
    "Onboarding": Onboarding,
    "Quiz": Quiz,
    "QuizLibrary": QuizLibrary,
    "StartLiveQuiz": StartLiveQuiz,
    "StudentStats": StudentStats,
    "Subject": Subject,
    "TeacherDashboard": TeacherDashboard,
    "Topic": Topic,
    "StudentDashboard": StudentDashboard,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};