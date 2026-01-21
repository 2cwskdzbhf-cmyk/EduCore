import AITutor from './pages/AITutor';
import AdminPanel from './pages/AdminPanel';
import ClassDetails from './pages/ClassDetails';
import CreateAssignment from './pages/CreateAssignment';
import JoinClass from './pages/JoinClass';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';
import Onboarding from './pages/Onboarding';
import Quiz from './pages/Quiz';
import StudentDashboard from './pages/StudentDashboard';
import Subject from './pages/Subject';
import TeacherDashboard from './pages/TeacherDashboard';
import Topic from './pages/Topic';
import ImportMathsContent from './pages/ImportMathsContent';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITutor": AITutor,
    "AdminPanel": AdminPanel,
    "ClassDetails": ClassDetails,
    "CreateAssignment": CreateAssignment,
    "JoinClass": JoinClass,
    "Landing": Landing,
    "Lesson": Lesson,
    "Onboarding": Onboarding,
    "Quiz": Quiz,
    "StudentDashboard": StudentDashboard,
    "Subject": Subject,
    "TeacherDashboard": TeacherDashboard,
    "Topic": Topic,
    "ImportMathsContent": ImportMathsContent,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};