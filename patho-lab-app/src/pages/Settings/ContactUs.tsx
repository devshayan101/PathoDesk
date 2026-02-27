import logoUrl from '../../assets/pathoDesk_logo.png';
import './ContactUs.css';

export default function ContactUsPage() {
    return (
        <div className="contact-us-page">
            <h1 className="page-title">Contact Us</h1>
            <div className="contact-card">
                <div className="contact-branding">
                    <img src={logoUrl} alt="PathoDesk Logo" className="contact-logo" />
                    <h2>FMS Softwares</h2>
                </div>

                <div className="contact-details">
                    <p>Have questions or need support? Reach out to us:</p>

                    <div className="contact-item">
                        <span className="icon">✉️</span>
                        <div>
                            <strong>Email:</strong><br />
                            <a href="mailto:fmsenterprises001@gmail.com">fmsenterprises001@gmail.com</a>
                        </div>
                    </div>

                    <div className="contact-item">
                        <span className="icon">📱</span>
                        <div>
                            <strong>WhatsApp:</strong><br />
                            <a href="https://wa.me/917765009936" target="_blank" rel="noopener noreferrer">+91 7765009936</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
