from django.shortcuts import render

# Create your views here.
def home(request):
    return render(request, 'homepage/index.html')

def login(request):
    return render(request, 'homepage/login.html')

def signup(request):
    return render(request, 'homepage/signup.html')

def about(request):
    return render(request, 'homepage/about.html')

def contact(request):
    return render(request, 'homepage/contact.html')

def courses(request):
    return render(request, 'homepage/courses.html')

def team(request):
    return render(request, 'homepage/team.html')

def testimonial(request):
    return render(request, 'homepage/testimonial.html')

def instructor(request):
    return render(request, 'homepage/instructor.html')

def single(request):
    return render(request, 'homepage/single.html')
