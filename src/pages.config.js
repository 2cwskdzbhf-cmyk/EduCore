import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import Subject from './pages/Subject';
import Topic from './pages/Topic';
import Lesson from './pages/Lesson';
import Quiz from './pages/Quiz';
import AITutor from './pages/AITutor';


export const PAGES = {
    "Landing": Landing,
    "Onboarding": Onboarding,
    "StudentDashboard": StudentDashboard,
    "Subject": Subject,
    "Topic": Topic,
    "Lesson": Lesson,
    "Quiz": Quiz,
    "AITutor": AITutor,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
};