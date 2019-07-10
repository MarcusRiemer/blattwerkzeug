FactoryBot.define do
  factory :user do
    display_name { "Blattwerkzeug" }
    email { }
    roles { [ Role.find_or_create_by(name: 'user') ] }

    trait :guest do
      id { User.guest_id }
      display_name { "Guest" }
      roles { [ Role.find_or_create_by(name: 'guest') ] }
    end

    trait :admin do
      roles { [ Role.find_or_create_by(name: 'admin') ] }
    end
  end
end
