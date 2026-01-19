import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import Subject from './pages/Subject';
import Topic from './pages/Topic';
import Lesson from './pages/Lesson';


export const PAGES = {
    "Landing": Landing,
    "Onboarding": Onboarding,
    "StudentDashboard": StudentDashboard,
    "Subject": Subject,
    "Topic": Topic,
    "Lesson": Lesson,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
};