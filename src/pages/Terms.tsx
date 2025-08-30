import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Heart, Mail, Globe, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Back Button */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground transition-colors">
            <Link to="/auth">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-3xl flex items-center justify-center shadow-glow mb-6">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            Terms of Service & Privacy Policy
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            MeetMate is designed for everyone by the Maken dev team. This app is completely free to help others connect and schedule effectively.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Free for everyone</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>Made by Maken dev team</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-green-500" />
              <span>Global accessibility</span>
            </div>
          </div>
        </div>

        {/* Terms of Service */}
        <Card className="mb-10 shadow-elegant border-0 bg-card/90 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">Terms of Service</CardTitle>
                <p className="text-foreground/80 mt-1">Please read these terms carefully before using MeetMate</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid gap-6">
              <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                  <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">1</span>
                  Acceptance of Terms
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  By accessing and using MeetMate ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                  This service is provided free of charge by the Maken development team to help people connect and schedule effectively.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                  <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">2</span>
                  Description of Service
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  MeetMate is a free scheduling and availability management platform designed for everyone. It allows users to share their availability, 
                  coordinate meetings across different timezones, and manage scheduling efficiently. This tool is created to help people connect 
                  regardless of their location or timezone.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                  <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">3</span>
                  User Accounts
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                  that occur under your account. You must notify us immediately of any unauthorized use of your account.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                  <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">4</span>
                  Acceptable Use
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, 
                  overburden, or impair the Service or interfere with any other party's use of the Service. 
                  This free tool is meant to help people, so please use it responsibly.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                  <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">5</span>
                  Free Service
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  MeetMate is completely free to use. The Maken development team has created this service to help people 
                  connect and schedule effectively without any cost barriers. We believe in making scheduling tools accessible to everyone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card className="mb-10 shadow-elegant border-0 bg-card/90 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
                         <div className="flex items-center space-x-3">
               <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                 <Shield className="h-6 w-6 text-primary" />
               </div>
                             <div>
                 <CardTitle className="text-3xl text-foreground font-bold">Privacy Policy</CardTitle>
                 <p className="text-foreground/90 mt-1">How we protect and handle your information</p>
               </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid gap-6">
                             <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                 <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                   <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">1</span>
                   Information We Collect
                 </h3>
                 <p className="text-foreground/90 leading-relaxed">
                   We collect information you provide directly to us, such as when you create an account, including your 
                   name, email address, timezone preferences, and availability information. This helps us provide you with 
                   the best scheduling experience possible.
                 </p>
               </div>

               <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                 <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                   <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">2</span>
                   How We Use Your Information
                 </h3>
                 <p className="text-foreground/90 leading-relaxed">
                   We use the information we collect to provide, maintain, and improve our services, to communicate with you, 
                   and to develop new features and services. Your data helps us make MeetMate better for everyone.
                 </p>
               </div>

               <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                 <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                   <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">3</span>
                   Information Sharing
                 </h3>
                 <p className="text-foreground/90 leading-relaxed">
                   We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                   except as described in this policy or as required by law. Your privacy is important to us.
                 </p>
               </div>

               <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                 <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                   <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">4</span>
                   Data Security
                 </h3>
                 <p className="text-foreground/90 leading-relaxed">
                   We implement appropriate security measures to protect your personal information against unauthorized access, 
                   alteration, disclosure, or destruction. Even though this is a free service, we take security seriously.
                 </p>
               </div>

               <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
                 <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                   <span className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-primary font-bold text-sm mr-3">5</span>
                   Your Rights
                 </h3>
                 <p className="text-foreground/90 leading-relaxed">
                   You have the right to access, update, or delete your personal information. You may also request a copy of 
                   your data or withdraw your consent at any time. We're here to help you maintain control over your data.
                 </p>
               </div>
            </div>
          </CardContent>
        </Card>

                 {/* Contact Information */}
         <Card className="shadow-elegant border-0 bg-card/90 backdrop-blur-sm">
           <CardHeader className="border-b border-border/50 pb-6">
             <div className="flex items-center space-x-3">
               <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                 <Mail className="h-6 w-6 text-green-500" />
               </div>
               <div>
                 <CardTitle className="text-3xl text-foreground">Contact Us</CardTitle>
                 <p className="text-foreground/80 mt-1">Get in touch with the Maken dev team</p>
               </div>
             </div>
           </CardHeader>
          <CardContent className="pt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground mb-4">About MeetMate</h3>
                                 <div className="space-y-3 text-foreground/90">
                   <div className="flex items-center space-x-3">
                     <Heart className="h-5 w-5 text-red-500" />
                     <span>Completely free to use</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <Users className="h-5 w-5 text-blue-500" />
                     <span>Designed by Maken dev team</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <Globe className="h-5 w-5 text-green-500" />
                     <span>Available worldwide</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <Clock className="h-5 w-5 text-purple-500" />
                     <span>Timezone-aware scheduling</span>
                   </div>
                 </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground mb-4">Get in Touch</h3>
                <div className="p-6 bg-muted/50 rounded-xl border border-border/50">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-foreground mb-1">Email:</p>
                      <a href="mailto:maken.hq@gmail.com" className="text-primary hover:text-primary/80 transition-colors">
                        maken.hq@gmail.com
                      </a>
                    </div>
                                         <div>
                       <p className="font-medium text-foreground mb-1">Support:</p>
                       <p className="text-foreground/90">
                         We're here to help! Reach out to us for any questions about MeetMate, 
                         technical support, or feedback about the service.
                       </p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

                 {/* Footer */}
         <div className="text-center mt-12 p-6 bg-muted/50 rounded-xl border border-border/50">
           <p className="text-foreground/90">
             Thank you for using MeetMate! This free service is made with ❤️ by the Maken development team 
             to help people connect and schedule effectively across the globe.
           </p>
         </div>
      </div>
    </div>
  );
};

export default Terms;
