# frozen_string_literal: true

require 'rails_helper'
require 'securerandom' # To make up unique slugs on the fly
require 'fileutils'    # To ease file comparision

RSpec.describe Seed::GrammarSeed do
  let(:seed_data_dir) { Rails.configuration.sqlino[:seed][:data_dir] }
  let(:grammar) { FactoryBot.create(:grammar, name: 'Test Grammar') }
  let(:payload) { grammar }

  let!(:subject) { described_class.new(payload) }

  before(:each) do
    FileUtils.rm_rf(seed_data_dir, secure: true)
  end

  describe 'grammar seed' do
    context 'when payload is grammar object'
    let(:payload) { grammar }
    it 'returns object' do
      expect(subject.seed).to be_a Grammar
    end

    context 'when payload is grammar id' do
      let(:payload) { grammar.id }

      it 'returns object' do
        expect(subject.seed).to be_a Grammar
      end
    end

    context 'when payload is project slug' do
      let(:payload) { grammar.slug }

      it 'returns project' do
        expect(subject.seed).to be_a Grammar
      end
    end

    context 'store, destroys and loads' do
      it 'an empty grammar by ID (CREATE)' do
        g_orig = FactoryBot.create(:grammar, name: 'Test Grammar')

        Seed::GrammarSeed.new(g_orig).start_store

        g_orig.destroy!

        Seed::GrammarSeed.new(g_orig.id).start_load
        g_load_data = Grammar.find_by(id: g_orig.id)

        expect(identifying_attributes(g_orig)).to eq identifying_attributes(g_load_data)
      end

      it 'an empty grammar by slug (CREATE)' do
        g_orig = FactoryBot.create(:grammar, name: 'Test Grammar')

        Seed::GrammarSeed.new(g_orig).start_store

        g_orig.destroy!

        Seed::GrammarSeed.new(g_orig.slug).start_load
        g_load_data = Grammar.find_by(id: g_orig.id)

        expect(identifying_attributes(g_orig)).to eq identifying_attributes(g_load_data)
      end
    end

    context 'stores and reloads ' do
      it 'an empty grammar (CREATE)' do
        g_orig = FactoryBot.create(:grammar, name: 'Test Grammar')

        Seed::GrammarSeed.new(g_orig).start_store

        # Making a change after storing
        g_orig.update_column('name', 'changed')

        Seed::GrammarSeed.new(g_orig.id).start_load
        g_load_data = Grammar.find_by(id: g_orig.id)
        g_orig.reload

        expect(identifying_attributes(g_orig)).to eq identifying_attributes(g_load_data)
      end
    end

    context 'references other grammar' do
      it 'include_types' do
        g_origin = FactoryBot.create(:grammar, name: 'Origin')
        g_target = FactoryBot.create(:grammar, name: 'Target')

        reference = create(:grammar_reference,
                           origin: g_origin,
                           target: g_target,
                           reference_type: 'include_types')

        expect(g_origin.targeted_grammars).to eq([g_target])

        Seed::GrammarSeed.new(g_origin).start_store

        g_origin.destroy!
        g_target.destroy!

        Seed::GrammarSeed.new(g_origin.id).start_load

        g_origin_load = Grammar.find_by(id: g_origin.id)
        g_target_load = g_origin_load.targeted_grammars.first
        reference_load = GrammarReference.first

        expect(identifying_attributes(g_origin_load)).to eq(identifying_attributes(g_origin))
        expect(identifying_attributes(g_target_load)).to eq(identifying_attributes(g_target))
        expect(identifying_attributes(reference_load)).to eq(identifying_attributes(reference))
      end

      it 'visualize' do
        g_origin = FactoryBot.create(:grammar, name: 'Origin')
        g_target = FactoryBot.create(:grammar, name: 'Target')

        reference = create(:grammar_reference,
                           origin: g_origin,
                           target: g_target,
                           reference_type: 'visualize')

        expect(g_origin.targeted_grammars).to eq([g_target])

        Seed::GrammarSeed.new(g_origin).start_store

        g_origin.destroy!
        g_target.destroy!

        Seed::GrammarSeed.new(g_origin.id).start_load

        g_origin_load = Grammar.find_by(id: g_origin.id)
        g_target_load = g_origin_load.targeted_grammars.first
        reference_load = GrammarReference.first

        expect(identifying_attributes(g_origin_load)).to eq(identifying_attributes(g_origin))
        expect(identifying_attributes(g_target_load)).to eq(identifying_attributes(g_target))
        expect(identifying_attributes(reference_load)).to eq(identifying_attributes(reference))
      end
    end
  end

  def identifying_attributes(model)
    model.attributes.except('created_at', 'updated_at')
  end
end
