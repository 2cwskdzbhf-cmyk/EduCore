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
import PracticeQuizPlay from './pages/PracticeQuizPlay';
import PracticeQuizResults from './pages/PracticeQuizResults';
import QuizLibrary from './pages/QuizLibrary';
import StartLiveQuiz from './pages/StartLiveQuiz';
import StudentClassDetail from './pages/StudentClassDetail';
import StudentDashboard from './pages/StudentDashboard';
import StudentStats from './pages/StudentStats';
import Subject from './pages/Subject';
import TeacherClassDetail from './pages/TeacherClassDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherQuestionBuilder from './pages/TeacherQuestionBuilder';
import TeacherQuestionGenerator from './pages/TeacherQuestionGenerator';
import Topic from './pages/Topic';
import AssignmentBuilder from './pages/AssignmentBuilder';
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
    "PracticeQuizPlay": PracticeQuizPlay,
    "PracticeQuizResults": PracticeQuizResults,
    "QuizLibrary": QuizLibrary,
    "StartLiveQuiz": StartLiveQuiz,
    "StudentClassDetail": StudentClassDetail,
    "StudentDashboard": StudentDashboard,
    "StudentStats": StudentStats,
    "Subject": Subject,
    "TeacherClassDetail": TeacherClassDetail,
    "TeacherDashboard": TeacherDashboard,
    "TeacherQuestionBuilder": TeacherQuestionBuilder,
    "TeacherQuestionGenerator": TeacherQuestionGenerator,
    "Topic": Topic,
    "AssignmentBuilder": AssignmentBuilder,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};