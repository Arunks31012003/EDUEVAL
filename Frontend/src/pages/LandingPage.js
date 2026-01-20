// landingpage.js - React Component for the Landing Page

    // Import React and its hooks
    import React, { useState, useEffect } from 'react';
    import { motion } from 'framer-motion';

    // Import Font Awesome icon for the hamburger
    import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
    import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

    // Import the CSS file.
    import '../styles/landingpage.css';

    // Import ModalDialog component
    import ModalDialog from '../components/ModalDialog';

    // Import LanguageSelector component
    import LanguageSelector from '../components/LanguageSelector';

    // Import language context
    import { useLanguage } from '../context/LanguageContext';

    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const LandingPage = () => {
    // Removed unused state variables: showTopBtn, email, feedback, isSubmitting, submitMessage
        const [hoveredFAQ, setHoveredFAQ] = useState(null);
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu
        const [modalType, setModalType] = useState(null); // State for modal type: 'privacy', 'terms', or null

        const { t } = useLanguage();

        const faqs = [
            {
                question: t('differencePlans'),
                answer: t('plansDesigned')
            },
            {
                question: t('dataSecure'),
                answer: t('securityTop')
            },
            {
                question: t('freeTrial'),
                answer: t('flexibleRefund')
            },
            {
                question: t('getSupport'),
                answer: t('contactForm')
            }
        ];

        // The useEffect hook is no longer needed since showTopBtn is removed.
        // It was only used to manage the scroll-to-top button which has been removed.
        useEffect(() => {
            const handleScroll = () => {
                // This logic is no longer needed
                // if (window.pageYOffset > 300) {
                //     setShowTopBtn(true);
                // } else {
                //     setShowTopBtn(false);
                // }
            };

            window.addEventListener('scroll', handleScroll);

            return () => window.removeEventListener('scroll', handleScroll);
        }, []);

        const scrollToSection = (id) => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
            setIsMobileMenuOpen(false); // Close mobile menu after clicking a link
        };


        return (
            <>
                {/* Header Section */}
                <header className="header">
                    <div className="logo" onClick={(e) => { e.preventDefault(); scrollToSection('home-section'); }} style={{ cursor: 'pointer' }}>
<img src="../images/logo.png" alt="Practice IELTS Logo" style={{ height: '80px', objectFit: 'contain' }} />
                    </div>
                    {/* Desktop Nav Menu and Buttons */}
                    <nav className="nav-menu">
                        {/* FIX: Added href attributes for accessibility */}
                        <a href="#home-section" onClick={(e) => { e.preventDefault(); scrollToSection('home-section'); }}>{t('home')}</a>
                        <a href="#features-section" onClick={(e) => { e.preventDefault(); scrollToSection('features-section'); }}>{t('features')}</a>
                        <a href="#payment-section" onClick={(e) => { e.preventDefault(); scrollToSection('payment-section'); }}>{t('payment')}</a>
                        <a href="#about-section" onClick={(e) => { e.preventDefault(); scrollToSection('about-section'); }}>{t('aboutUs')}</a>
                        <a href="#faq-section" onClick={(e) => { e.preventDefault(); scrollToSection('faq-section'); }}>{t('faq')}</a>
                        <a href="#footer-section" onClick={(e) => { e.preventDefault(); scrollToSection('footer-section'); }}>{t('support')}</a>
                    </nav>
                    <div className="header-buttons">
                        <LanguageSelector />
                        <button className="login-btn" onClick={() => window.location.href = '/login'}>{t('login')}</button>
                        <button className="register-btn" onClick={() => window.location.href = '/register'}>{t('register')}</button>
                    </div>

                    {/* Hamburger Menu Icon (Mobile Only) */}
                    {/* This button will be displayed block on mobile via CSS and hidden on desktop */}
                    <button className="hamburger-icon-button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation menu">
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {/* The 'active' class is controlled by isMobileMenuOpen state and CSS for transitions */}
                <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
                    <div className="mobile-nav-content">
                        <button className="mobile-menu-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation menu">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                        <ul className="mobile-nav-links">
                            {/* FIX: Added href attributes for accessibility */}
                        <a href="#home-section" onClick={(e) => { e.preventDefault(); scrollToSection('home-section'); }}>{t('home')}</a>
                            <li><a href="#features-section" onClick={(e) => { e.preventDefault(); scrollToSection('features-section'); }}>{t('features')}</a></li>
                            <li><a href="#payment-section" onClick={(e) => { e.preventDefault(); scrollToSection('payment-section'); }}>{t('payment')}</a></li>
                            <li><a href="#about-section" onClick={(e) => { e.preventDefault(); scrollToSection('about-section'); }}>{t('aboutUs')}</a></li>
                            <li><a href="#faq-section" onClick={(e) => { e.preventDefault(); scrollToSection('faq-section'); }}>{t('faq')}</a></li>
                            <li><a href="#contact-section" onClick={(e) => { e.preventDefault(); scrollToSection('contact-section'); }}>Contact</a></li>
                        </ul>
                        <div className="mobile-header-buttons">
                            <button className="login-btn" onClick={() => window.location.href = '/login'}>{t('login')}</button>
                            <button className="register-btn" onClick={() => window.location.href = '/register'}>{t('register')}</button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <motion.main
                    className="main-content" 
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    {/* Hero Section */}
                     <motion.section
                        id="home-section"
                        className="hero-section"
                        variants={fadeInUp}
                    >
                        <div className="hero-content">
                            <div className="hero-text">
                                <h3>{t('boostBands')}</h3>
                                <p>{t('signUpExperience')}</p>
                                <button className="hero-primary-btn" onClick={() => window.location.href = '/register'}>{t('startMyFreeTest')}</button>
                            </div>
                            <div className="hero-image">
                                <img src="/images/Heroimage.png" alt="IELTS Exam Simulation" />
                            </div>
                        </div>
                    </motion.section>
             

                    {/* Features Section */}
                    <motion.section
                        id="features-section"
                        className="features-section"
                        variants={fadeInUp}
                    >
                        <div className="features-container">
                            {/* Left column for text content */}
                            <div className="features-text">
                                <motion.h2 variants={fadeInUp}>{t('whyChoose')}
                           </motion.h2> </div>
                            {/* Right column for the feature cards */}
                            <motion.div
                            className="feature-cards-grid"
                            variants={staggerContainer}
                        >
                            <motion.div
                                className="feature-card"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="feature-card-icon">
                                    {/* CORRECTED PATH */}
                                    <img src="images/Real Mock Test.png" alt="Real Exam Experience Icon" />
                                </div>
                                <h3>{t('trueIELTSExperience')}</h3>
                            </motion.div>

                            <motion.div
                                className="feature-card"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="feature-card-icon">
                                    {/* CORRECTED PATH */}
                                    <img src="images/AI scoring.png" alt="AI Feedback Icon" />
                                </div>
                                <h3>{t('aiPoweredFeedback')}</h3>
                            </motion.div>
                            <motion.div
                                className="feature-card"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="feature-card-icon">
                                    {/* CORRECTED PATH */}
                                    <img src="images/detailedanalytics.png" alt="Detailed Analytics Icon" />
                                </div>
                                <h3>{t('detailedAnalytics')}</h3>
                            </motion.div>
                            <motion.div
                                className="feature-card"
                                variants={fadeInUp}
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="feature-card-icon">
                                    {/* CORRECTED PATH */}
                                    <img src="images/Expert Curated Study Plan.png" alt="Dedicated Support Icon" />
                                </div>
                                <h3>{t('dedicatedSupport')}</h3>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                    {/* Payment Section */}
                    <motion.section
                        id="payment-section"
                        className="payment-section"
                        variants={fadeInUp}
                    >
                        <h2><center>{t('flexiblePayment')}</center></h2>
                        <div className="payment-plans">
                            <div className="payment-card basic">
                                <h3>{t('freePlan')}</h3>
                                <p>{t('perfectIndividuals')}</p>
                                <div className="price">{t('freePerMonth')}</div>
                                <button className="choose-btn basic-btn" onClick={() => window.location.href = '/register'}>{t('chooseFreePlan')}</button>
                            </div>
                            <div className="payment-card pro">
                                <h3>{t('basicPlan')}</h3>
                                <p>{t('idealGrowing')}</p>
                                <div className="price">{t('rs49PerMonth')}</div>
                                <button className="choose-btn pro-btn">{t('chooseBasic')}</button>
                            </div>
                            <div className="payment-card enterprise">
                                <h3>{t('proPlan')}</h3>
                                <p>{t('largeOrganizations')}</p>
                                <div className="price">{t('rs99PerMonth')}</div>
                                <button className="choose-btn enterprise-btn">{t('choosePro')}</button>
                            </div>
                        </div>
                    </motion.section>
<motion.section
    id="about-section"
    className="about-section"
    variants={fadeInUp}
>
    <h2>{t('whoWeAre')}</h2>
    <div className="about-creative-container">
        <motion.div
            className="about-text-card"
            variants={fadeInUp}
        >
            <h3>{t('ourMissionValues')}</h3>
            <p className="justify-text">{t('atPracticeIELTS')}</p>
            <p className="justify-text">{t('weBelieve')}</p>
            <h3>{t('coreValues')}</h3>
            <p className="justify-text">
                <b>{t('excellence')}</b>
                <br />
                <b>{t('userFocused')}</b>
                <br />
                <b>{t('accessibility')}</b>
                <br />
                <b>{t('integrityPrivacy')}</b>
            </p>
            <p className="justify-text">{t('joinUs')}</p>
        </motion.div>
    </div>
</motion.section>

                    {/* FAQ Section */}
                    <motion.section
                        id="faq-section"
                        className="faq-section"
                        variants={fadeInUp}
                    >
                        <h2>{t('frequentlyAsked')}</h2>
                        <div className="faq-container">
                            {faqs.map((faq, index) => (
                                <motion.div
                                    key={index}
                                    className={`faq-item ${hoveredFAQ === index ? 'active' : ''}`}
                                    onMouseEnter={() => setHoveredFAQ(index)}
                                    onMouseLeave={() => setHoveredFAQ(null)}
                                    variants={fadeInUp}
                                >
                                    <h3>{faq.question}</h3>
                                    <p className="faq-answer">{faq.answer}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    {/* Footer Section */}
                    <motion.footer
                        id="footer-section"
                        className="footer"
                        variants={fadeInUp}
                    >
                        <div className="footer-copyright">
                           
                            <div className="privacy-terms">
                                {/* FIX: Replaced href="#" with valid, navigable paths */}
                                <a href="#Support">{t('support')}</a>
                                <a href="#about-section" onClick={(e) => { e.preventDefault(); scrollToSection('about-section'); }}>{t('aboutUs')}</a>
                                <a href="#privacy-policy" onClick={(e) => { e.preventDefault(); setModalType('privacy'); }}>{t('privacyPolicy')}</a>
                                <a href="#terms-of-service" onClick={(e) => { e.preventDefault(); setModalType('terms'); }}>{t('termsOfService')}</a>
                            </div>
                         <p>&copy; 2025 EduEval.com, All rights reserved.</p>
                            <p><b>"Developed and maintained by Arun Kumar K S"</b></p>
                        </div>
                    </motion.footer>

                </motion.main>

                {/* Modal for Privacy Policy and Terms of Service */}
                <ModalDialog
                    isOpen={!!modalType}
                    onClose={() => setModalType(null)}
                    title={modalType === 'privacy' ? 'Privacy Policy' : modalType === 'terms' ? 'Terms and Conditions' : ''}
                >
                    <div>
{modalType === 'privacy' && (
                            <>
                                
                                <p><strong>Effective Date: 08th September 2025</strong></p>
                                <p><strong>EduEval.com</strong> ("we," "our," or "us") values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard the information you provide when using our IELTS preparation web app and related services.</p>
                                <hr />
                                
                                <p><strong>1. Information We Collect</strong></p>
                                <ul>
                                    <li><strong>Personal Information:</strong> Name, email address, phone number, and account credentials when you sign up.</li>
                                    <li><strong>Usage Data:</strong> Interactions with mock tests, courses, AI scoring, and other features.</li>
                                    <li><strong>Device Information:</strong> Browser type, IP address, operating system, and device identifiers.</li>
                                    <li><strong>Payment Information:</strong> When you purchase courses or subscriptions (processed securely through third-party payment providers).</li>
                                </ul>
                                <hr />

                                <p><strong>2. How We Use Your Information</strong></p>
                                <ul>
                                    <li>Provide access to courses, mock tests, and AI scoring.</li>
                                    <li>Track your progress and performance.</li>
                                    <li>Personalize study recommendations.</li>
                                    <li>Improve our services and user experience.</li>
                                    <li>Process payments and manage subscriptions.</li>
                                    <li>Send updates, notifications, or customer support communications.</li>
                                </ul>
                                <hr />

                                <p><strong>3. Data Sharing and Disclosure</strong></p>
                                <ul>
                                    <li>Service Providers: With trusted third parties (e.g., payment processors, analytics, cloud hosting) to operate our platform.</li>
                                    <li>Legal Requirements: If required by law, regulation, or legal process.</li>
                                    <li>Business Transfers: In case of a merger, acquisition, or sale of assets, your data may be transferred.</li>
                                </ul>
                                <hr />

                                <p><strong>4. Data Security</strong></p>
                                <p>We use industry-standard security practices to protect your personal information. However, no method of transmission over the Internet is 100% secure. We encourage you to use strong passwords and protect your login credentials.</p>
                                <hr />

                                <p><strong>5. Your Rights</strong></p>
                                <ul>
                                    <li>Access, update, or delete your personal data.</li>
                                    <li>Opt out of marketing emails.</li>
                                    <li>Request a copy of your stored information.</li>
                                </ul>
                                <p>To exercise these rights, contact us at Support @ practiceIELTS .com</p>
                                <hr />

                                <p><strong>6. Cookies and Tracking</strong></p>
                                <ul>
                                    <li>Improve website functionality.</li>
                                    <li>Analyze usage patterns.</li>
                                    <li>Store preferences.</li>
                                </ul>
                                <p>You can manage cookies through your browser settings.</p>
                                <hr />
                                
                                <p><strong>7. Children’s Privacy</strong></p>
                                <p>Our services are not directed toward children under 13 (or the age of consent in your country). We do not knowingly collect personal data from children.</p>
                                <hr />
                                <p><strong>8. Changes to This Privacy Policy</strong></p>
                                <p>We may update this Privacy Policy from time to time. Any changes will be posted with the "Effective Date" at the top.</p>
                                <hr />
                                <p><strong>9. Contact Us</strong></p>
                                <p>If you have any questions about this Privacy Policy, contact our support team.</p>
                            </>
                        )}
                        {modalType === 'terms' && (
                            <>
                                
                                <p><strong>Effective Date: 08th September 2025</strong></p>
                                <p>Welcome to EduEval.com (“we,” “our,” “us”). By accessing or using our IELTS preparation platform, including courses, mock tests, and AI-powered scoring, you explicitly agree to these Terms and Conditions. Please read them carefully.</p>
                                <hr />

                                <p><strong>1. Use of Our Services</strong></p>
                                <p>• You must create an account to access certain features.</p>
                                <p>• You agree to provide accurate and complete information during registration.</p>
                                <p>• You are responsible for maintaining the confidentiality of your login credentials.</p>
                                <hr />

                                <p><strong>2. Eligibility</strong></p>
                                <p>• You must be at least 13 years old (or the age of consent in your country).</p>
                                <p>• If under 18, you must have parental or guardian consent.</p>
                                <hr />

                                <p><strong>3. Courses, Mock Tests, and AI Scoring</strong></p>
                                <p>• We provide practice materials and AI-based scoring to help you prepare for IELTS.</p>
                                <p>• Our AI scoring is for practice purposes only and does not represent official IELTS scoring.</p>
                                <p>• We do not guarantee any specific test results, scores, or outcomes.</p>
                                <p>• We cannot be held liable for low score in Real IELTS examinations.</p>
                                <hr />

                                <p><strong>4. Payments and Subscriptions</strong></p>
                                <p>• Some features require a paid subscription or one-time purchase.</p>
                                <p>• Payments are processed securely through third-party providers.</p>
                                <p>• All fees are non-refundable unless required by law.</p>
                                <p>• Subscriptions renew automatically unless cancelled before the renewal date.</p>
                                <hr />

                                <p><strong>5. Intellectual Property</strong></p>
                                <p>• All content, including text, graphics, icons, logos, mock tests, and software, is the property of EduEval.com or its licensors.</p>
                                <p>• You may not copy, modify, distribute, or sell our content without written permission.</p>
                                <hr />

                                <p><strong>6. User Conduct</strong></p>
                                <p>You agree not to:</p>
                                <p>• Misuse the platform, hack, or disrupt services.</p>
                                <p>• Share, resell, or distribute your account access.</p>
                                <p>• Upload harmful, offensive, or illegal content.</p>
                                <hr />

                                <p><strong>7. Limitation of Liability</strong></p>
                                <p>• Our services are provided “as is” and “as available.”</p>
                                <p>• We make no guarantees about accuracy, reliability, or availability.</p>
                                <p>• We are not liable for any direct, indirect, or consequential damages arising from the use of our platform.</p>
                                <hr />

                                <p><strong>8. Third-Party Services</strong></p>
                                <p>We may use third-party tools (e.g., payment processors, analytics, hosting). We are not responsible for their policies or actions.</p>
                                <hr />

                                <p><strong>9. Termination</strong></p>
                                <p>• We may suspend or terminate your account if you violate these Terms.</p>
                                <p>• You may stop using the service at any time by cancelling your account/subscription.</p>
                                <hr />

                                <p><strong>10. Changes to These Terms</strong></p>
                                <p>We may update these Terms from time to time. The latest version will always be posted with the “Effective Date.”</p>
                                <hr />

                                <p><strong>11. Governing Law</strong></p>
                                <p>These Terms shall be governed by and interpreted under the laws of Haryana – India.</p>
                           
                            </>
                        )}
                    </div>
                </ModalDialog>
            </>
        );
    };

    // Export the component for use in other modules

    export default LandingPage;
