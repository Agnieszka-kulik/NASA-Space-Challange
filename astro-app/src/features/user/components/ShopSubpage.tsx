import { Link } from 'react-router-dom'

export interface RewardItem {
  id: string
  icon: string
  name: string
  category: string
  price: number
  description: string
  claimedCount: number
}

interface ShopSubpageProps {
  points: number
  rewards: RewardItem[]
  onClaimReward: (item: RewardItem) => void
}

export default function ShopSubpage({
  points,
  rewards,
  onClaimReward,
}: ShopSubpageProps) {
  return (
    <div className="user-subpage">
      <div className="user-subpage__top">
        <Link to="/user" className="user-back-btn">
          ← Back to Astronaut Panel
        </Link>
        <div className="user-points-pill">
          ⭐ Your points: <strong>{points} pts</strong>
        </div>
      </div>

      <h1 className="user-subpage__title">Crew Rewards Shop</h1>
      <p className="user-subpage__subtitle">
        Exchange points earned from regular measurements, workouts, and cognitive minigames for snacks, movies, and station perks!
      </p>

      <div className="shop-grid">
        {rewards.map((item) => {
          const canAfford = points >= item.price
          return (
            <div key={item.id} className="shop-card">
              <div className="shop-card__icon">{item.icon}</div>
              <span className="shop-card__category">{item.category}</span>
              <h3 className="shop-card__name">{item.name}</h3>
              <p className="shop-card__desc">{item.description}</p>
              {item.claimedCount > 0 && (
                <div className="shop-card__claimed">
                  Claimed: <strong>{item.claimedCount}x</strong>
                </div>
              )}
              <button
                type="button"
                className={`shop-card__btn ${canAfford ? 'shop-card__btn--buy' : 'shop-card__btn--disabled'
                  }`}
                disabled={!canAfford}
                onClick={() => onClaimReward(item)}
              >
                {canAfford
                ? `Claim for ${item.price} pts`
                : `Need ${item.price - points} more pts (Cost: ${item.price} pts)`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
