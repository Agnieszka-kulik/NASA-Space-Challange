import { useNavigate } from 'react-router-dom'
import SpaceBackground from '../../shared/components/SpaceBackground'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <SpaceBackground>
      <main className="home">
        <h1 className="home__title">Mission Control</h1>
        <div className="home__buttons">
          <button className="home__btn" onClick={() => navigate('/admin')}>
            Admin
          </button>
          <button className="home__btn" onClick={() => navigate('/user')}>
            User
          </button>
        </div>
      </main>
    </SpaceBackground>
  )
}
