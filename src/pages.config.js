import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import Subject from './pages/Subject';
import Topic from './pages/Topic';
import Lesson from './pages/Lesson';
import Quiz from './pages/Quiz';
import AITutor from './pages/AITutor';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateAssignment from './pages/CreateAssignment';
import ClassDetails from './pages/ClassDetails';


export const PAGES = {
    "Landing": Landing,
    "Onboarding": Onboarding,
    "StudentDashboard": StudentDashboard,
    "Subject": Subject,
    "Topic": Topic,
    "Lesson": Lesson,
    "Quiz": Quiz,
    "AITutor": AITutor,
    "TeacherDashboard": TeacherDashboard,
    "CreateAssignment": CreateAssignment,
    "ClassDetails": ClassDetails,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
};