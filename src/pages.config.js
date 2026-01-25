import AITutor from './pages/AITutor';
import AdminPanel from './pages/AdminPanel';
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
import QuestionBank from './pages/QuestionBank';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITutor": AITutor,
    "AdminPanel": AdminPanel,
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
    "QuestionBank": QuestionBank,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};