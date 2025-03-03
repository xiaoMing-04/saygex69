from django.urls import path
from .views import *

urlpatterns = [
    path('', home, name='home'),
    path('login/', login, name='login'),
    path('signup/', signup, name='signup'),
    path('about/', about, name='about'),
    path('contact/', contact, name='contact'),
    path('courses/', courses, name='courses'),
    path('team/', team, name='team'),
    path('testimonial/', testimonial, name='testimonial'),
    path('instructor/', instructor, name='instructor'),
    path('single/', single, name='single'),
]